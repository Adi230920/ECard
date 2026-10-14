import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ReviewContactScreenProps } from '../types/navigation';
import { OcrServiceError, recognizeCardText } from '../services/ocrService';
import {
  parseContactFromOcr,
  type ParsedContact,
  type RejectedText,
} from '../services/contactParsingService';
import { contactRepository } from '../database/contactRepository';
import type { ContactInsert } from '../types/contact';
import {
  sanitizeContactDraft,
  validateContactDraft,
  type ContactDraft,
  type DuplicateContactMatch,
} from '../utils/contactSaving';

type ReviewState =
  | { status: 'processing' }
  | { status: 'success'; parsed: ParsedContact }
  | { status: 'empty' }
  | { status: 'error'; message: string };

type EditableContact = ContactDraft;

const EMPTY_CONTACT: EditableContact = {
  name: '',
  designation: '',
  company: '',
  phones: [],
  emails: [],
  website: '',
  address: '',
  linkedin: '',
  notes: '',
};

interface ContactFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'url';
  multiline?: boolean;
}

const ContactField = ({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  multiline = false,
}: ContactFieldProps) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      autoCapitalize={keyboardType === 'email-address' || keyboardType === 'url' ? 'none' : 'sentences'}
      autoCorrect={keyboardType !== 'email-address' && keyboardType !== 'url'}
      keyboardType={keyboardType}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={`Enter ${label.toLowerCase()}`}
      style={[styles.input, multiline && styles.multilineInput]}
      value={value}
    />
  </View>
);

interface MultiValueFieldProps {
  label: string;
  values: string[];
  keyboardType: 'email-address' | 'phone-pad';
  onChange: (values: string[]) => void;
}

const MultiValueField = ({ label, values, keyboardType, onChange }: MultiValueFieldProps) => {
  const updateValue = (index: number, value: string) => {
    onChange(values.map((current, currentIndex) => (currentIndex === index ? value : current)));
  };

  const removeValue = (index: number) => {
    onChange(values.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {values.map((value, index) => (
        <View key={`${label}-${index}`} style={styles.multiValueRow}>
          <TextInput
            accessibilityLabel={`${label} ${index + 1}`}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={keyboardType}
            onChangeText={(nextValue) => updateValue(index, nextValue)}
            placeholder={`Enter ${label.toLowerCase()}`}
            style={[styles.input, styles.multiValueInput]}
            value={value}
          />
          <TouchableOpacity
            accessibilityLabel={`Remove ${label.toLowerCase()} ${index + 1}`}
            onPress={() => removeValue(index)}
            style={styles.removeButton}
          >
            <Text style={styles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...values, ''])} style={styles.addButton}>
        <Text style={styles.addButtonText}>+ Add {label.toLowerCase()}</Text>
      </TouchableOpacity>
    </View>
  );
};

export const ReviewContactScreen = ({ route, navigation }: ReviewContactScreenProps) => {
  const imagePath = route.params?.imagePath;
  const [attempt, setAttempt] = useState(0);
  const [reviewState, setReviewState] = useState<ReviewState>({ status: 'processing' });
  const [contact, setContact] = useState<EditableContact>(EMPTY_CONTACT);
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [recoveredText, setRecoveredText] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const saveInProgress = useRef(false);

  useEffect(() => {
    let isActive = true;

    const processCardImage = async () => {
      setReviewState({ status: 'processing' });

      if (!imagePath) {
        setReviewState({ status: 'error', message: 'No card image was provided.' });
        return;
      }

      try {
        const result = await recognizeCardText(imagePath);
        if (!isActive) return;

        if (!result.text.trim()) {
          setReviewState({ status: 'empty' });
          return;
        }

        const parsed = parseContactFromOcr(result);
        setContact({
          name: parsed.name,
          designation: parsed.designation,
          company: parsed.company,
          phones: parsed.phones,
          emails: parsed.emails,
          website: parsed.website,
          address: parsed.address,
          linkedin: parsed.linkedin,
          notes: parsed.notes,
        });
        setRecoveredText(new Set());
        setShowOriginalText(false);
        setReviewState({ status: 'success', parsed });
      } catch (error) {
        if (!isActive) return;

        const message =
          error instanceof OcrServiceError
            ? error.message
            : 'Text recognition failed. Try another image.';
        setReviewState({ status: 'error', message });
      }
    };

    void processCardImage();

    return () => {
      isActive = false;
    };
  }, [attempt, imagePath]);

  const updateField = <Key extends keyof EditableContact>(
    key: Key,
    value: EditableContact[Key]
  ) => {
    setContact((current) => ({ ...current, [key]: value }));
  };

  const addToNotes = (key: string, text: string) => {
    setContact((current) => ({
      ...current,
      notes: current.notes.trim() ? `${current.notes.trim()}\n${text}` : text,
    }));
    setRecoveredText((current) => new Set(current).add(key));
  };

  const finishSaving = () => {
    saveInProgress.current = false;
    setIsSaving(false);
  };

  const saveContact = async (contactToSave: ContactInsert) => {
    try {
      await contactRepository.insert(contactToSave);
      Alert.alert(
        'Contact saved',
        'The contact was saved locally on this device.',
        [{ text: 'OK', onPress: () => navigation.popToTop() }],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Failed to save contact:', error);
      finishSaving();
      Alert.alert(
        'Could not save contact',
        'Your edits are still here. Please try saving again.'
      );
    }
  };

  const describeDuplicate = (match: DuplicateContactMatch): string => {
    const label =
      match.contact.name ||
      match.contact.company ||
      match.contact.emails[0] ||
      match.contact.phones[0] ||
      `Contact ${match.contact.id}`;
    const matchingValues = [...match.matchedPhones, ...match.matchedEmails].join(', ');
    return `• ${label}: ${matchingValues}`;
  };

  const handleSave = async (parsed: ParsedContact) => {
    if (saveInProgress.current) return;

    saveInProgress.current = true;
    setIsSaving(true);

    const sanitized = sanitizeContactDraft(contact);
    setContact(sanitized);
    const validationErrors = validateContactDraft(sanitized);

    if (validationErrors.length > 0) {
      finishSaving();
      Alert.alert('Check contact details', validationErrors.join('\n'));
      return;
    }

    const optionalText = (value: string): string | null => value || null;
    const contactToSave: ContactInsert = {
      name: optionalText(sanitized.name),
      designation: optionalText(sanitized.designation),
      company: optionalText(sanitized.company),
      phones: sanitized.phones,
      emails: sanitized.emails,
      website: optionalText(sanitized.website),
      address: optionalText(sanitized.address),
      linkedin: optionalText(sanitized.linkedin),
      notes: optionalText(sanitized.notes),
      image_path: imagePath ?? null,
      raw_ocr_text: parsed.originalText,
    };

    try {
      const duplicates = await contactRepository.findPotentialDuplicates(
        sanitized.phones,
        sanitized.emails
      );

      if (duplicates.length > 0) {
        Alert.alert(
          'Potential duplicate',
          `Matching saved contacts:\n\n${duplicates.map(describeDuplicate).join('\n')}`,
          [
            { text: 'Cancel', style: 'cancel', onPress: finishSaving },
            { text: 'Save Anyway', onPress: () => void saveContact(contactToSave) },
          ],
          { cancelable: false }
        );
        return;
      }

      await saveContact(contactToSave);
    } catch (error) {
      console.error('Failed to check for duplicate contacts:', error);
      finishSaving();
      Alert.alert(
        'Could not save contact',
        'Your edits are still here. Please try saving again.'
      );
    }
  };

  const renderRecoveryLine = (
    item: { text: string; reason?: string },
    key: string
  ) => {
    const isRecovered = recoveredText.has(key);
    return (
      <View key={key} style={styles.recoveryRow}>
        <View style={styles.recoveryTextContainer}>
          <Text selectable style={styles.recoveryText}>{item.text}</Text>
          {item.reason ? <Text style={styles.recoveryReason}>{item.reason}</Text> : null}
        </View>
        <TouchableOpacity
          disabled={isRecovered}
          onPress={() => addToNotes(key, item.text)}
          style={[styles.recoverButton, isRecovered && styles.disabledButton]}
        >
          <Text style={styles.recoverButtonText}>{isRecovered ? 'Added' : 'Add to Notes'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderReviewForm = (parsed: ParsedContact) => {
    const filtered: RejectedText[] = parsed.filteredLines;
    return (
      <>
        <View style={styles.resultCard}>
          <Text style={styles.heading}>Review contact</Text>
          <Text style={styles.helperText}>
            Check every field and correct anything the card reader classified incorrectly.
          </Text>

          <ContactField label="Name" value={contact.name} onChangeText={(value) => updateField('name', value)} />
          <ContactField
            label="Designation"
            value={contact.designation}
            onChangeText={(value) => updateField('designation', value)}
          />
          <ContactField
            label="Company"
            value={contact.company}
            onChangeText={(value) => updateField('company', value)}
          />
          <MultiValueField
            keyboardType="phone-pad"
            label="Phone"
            onChange={(values) => updateField('phones', values)}
            values={contact.phones}
          />
          <MultiValueField
            keyboardType="email-address"
            label="Email"
            onChange={(values) => updateField('emails', values)}
            values={contact.emails}
          />
          <ContactField
            keyboardType="url"
            label="Website"
            value={contact.website}
            onChangeText={(value) => updateField('website', value)}
          />
          <ContactField
            keyboardType="url"
            label="LinkedIn"
            value={contact.linkedin}
            onChangeText={(value) => updateField('linkedin', value)}
          />
          <ContactField
            label="Address"
            multiline
            value={contact.address}
            onChangeText={(value) => updateField('address', value)}
          />
          <ContactField
            label="Notes"
            multiline
            value={contact.notes}
            onChangeText={(value) => updateField('notes', value)}
          />
        </View>

        {parsed.uncertainLines.length > 0 || filtered.length > 0 ? (
          <View style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Other detected text</Text>
            <Text style={styles.helperText}>
              This text was not placed into contact fields. Add anything useful to Notes.
            </Text>
            {parsed.uncertainLines.map((text, index) =>
              renderRecoveryLine({ text }, `uncertain-${index}-${text}`)
            )}
            {filtered.map((item, index) =>
              renderRecoveryLine(item, `filtered-${index}-${item.text}`)
            )}
          </View>
        ) : null}

        <View style={styles.resultCard}>
          <TouchableOpacity onPress={() => setShowOriginalText((current) => !current)}>
            <Text style={styles.originalTextToggle}>
              {showOriginalText ? 'Hide original OCR text' : 'Show original OCR text'}
            </Text>
          </TouchableOpacity>
          {showOriginalText ? (
            <Text selectable style={styles.extractedText}>{parsed.originalText}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => void handleSave(parsed)}
          style={[styles.primaryButton, isSaving && styles.disabledPrimaryButton]}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Save Contact</Text>
          )}
        </TouchableOpacity>
      </>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {imagePath ? <Image source={{ uri: imagePath }} style={styles.cardImage} resizeMode="contain" /> : null}

      {reviewState.status === 'processing' ? (
        <View style={styles.resultCard}>
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.stateText}>Reading and organizing card details on this device…</Text>
          </View>
        </View>
      ) : null}

      {reviewState.status === 'success' ? renderReviewForm(reviewState.parsed) : null}

      {reviewState.status === 'empty' ? (
        <View style={styles.resultCard}>
          <View style={styles.centeredState}>
            <Text style={styles.stateTitle}>No text found</Text>
            <Text style={styles.stateText}>Try a sharper image with the card filling the frame.</Text>
          </View>
        </View>
      ) : null}

      {reviewState.status === 'error' ? (
        <View style={styles.resultCard}>
          <View style={styles.centeredState}>
            <Text style={styles.stateTitle}>Could not read this card</Text>
            <Text style={styles.stateText}>{reviewState.message}</Text>
          </View>
        </View>
      ) : null}

      {reviewState.status !== 'processing' && reviewState.status !== 'success' ? (
        <TouchableOpacity style={styles.primaryButton} onPress={() => setAttempt((value) => value + 1)}>
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryButtonText}>Back to Scan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  cardImage: {
    width: '100%',
    height: 220,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#E9ECEF',
  },
  resultCard: {
    marginBottom: 16,
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DEE2E6',
  },
  heading: {
    marginBottom: 6,
    fontSize: 22,
    fontWeight: '700',
    color: '#212529',
  },
  sectionTitle: {
    marginBottom: 4,
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  helperText: {
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    color: '#6C757D',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#343A40',
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CED4DA',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
    color: '#212529',
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  multiValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  multiValueInput: {
    flex: 1,
  },
  removeButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C92A2A',
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
  },
  recoveryRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  recoveryTextContainer: {
    marginBottom: 8,
  },
  recoveryText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#212529',
  },
  recoveryReason: {
    marginTop: 3,
    fontSize: 12,
    color: '#868E96',
  },
  recoverButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#E7F5FF',
  },
  disabledButton: {
    backgroundColor: '#E9ECEF',
  },
  recoverButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0066CC',
  },
  originalTextToggle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066CC',
  },
  extractedText: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    color: '#343A40',
  },
  centeredState: {
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateTitle: {
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
  },
  stateText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    color: '#6C757D',
  },
  primaryButton: {
    marginTop: 4,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#007AFF',
  },
  disabledPrimaryButton: {
    opacity: 0.65,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ADB5BD',
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
});
