import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import {
  createContactDraftFromSaved,
  createEditableContactUpdate,
  updateSavedContact,
} from '../utils/contactEditing';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../components/ui/AppButton';
import { BusinessCardPreview } from '../components/cards/BusinessCardPreview';
import { useAppTheme } from '../theme/ThemeProvider';
import { layout, radii, spacing, typography, type ThemeColors } from '../theme/tokens';

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
}: ContactFieldProps) => {
  const styles = useReviewStyles();
  const { theme } = useAppTheme();
  return <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      autoCapitalize={keyboardType === 'email-address' || keyboardType === 'url' ? 'none' : 'sentences'}
      autoCorrect={keyboardType !== 'email-address' && keyboardType !== 'url'}
      keyboardType={keyboardType}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={`Enter ${label.toLowerCase()}`}
      placeholderTextColor={theme.colors.textMuted}
      selectionColor={theme.colors.primary}
      style={[styles.input, multiline && styles.multilineInput]}
      value={value}
    />
  </View>;
};

interface MultiValueFieldProps {
  label: string;
  values: string[];
  keyboardType: 'email-address' | 'phone-pad';
  onChange: (values: string[]) => void;
}

const MultiValueField = ({ label, values, keyboardType, onChange }: MultiValueFieldProps) => {
  const styles = useReviewStyles();
  const { theme } = useAppTheme();
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
            placeholderTextColor={theme.colors.textMuted}
            selectionColor={theme.colors.primary}
            style={[styles.input, styles.multiValueInput]}
            value={value}
          />
          <TouchableOpacity
            accessibilityLabel={`Remove ${label.toLowerCase()} ${index + 1}`}
            onPress={() => removeValue(index)}
            style={styles.removeButton}
          >
            <Ionicons color={theme.colors.danger} name="remove-circle-outline" size={22} />
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
  const styles = useReviewStyles();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const imagePath = route.params?.imagePath;
  const contactId = route.params?.contactId;
  const isEditMode = contactId !== undefined;
  const [attempt, setAttempt] = useState(0);
  const [reviewState, setReviewState] = useState<ReviewState>({ status: 'processing' });
  const [contact, setContact] = useState<EditableContact>(EMPTY_CONTACT);
  const [displayImagePath, setDisplayImagePath] = useState<string | undefined>(imagePath);
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [recoveredText, setRecoveredText] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const saveInProgress = useRef(false);

  useEffect(() => {
    let isActive = true;

    const loadContactForm = async () => {
      setReviewState({ status: 'processing' });

      if (contactId !== undefined) {
        try {
          const savedContact = await contactRepository.getById(contactId);
          if (!isActive) return;

          if (!savedContact) {
            setReviewState({
              status: 'error',
              message: 'This saved contact is no longer available on this device.',
            });
            return;
          }

          const savedDraft = createContactDraftFromSaved(savedContact);
          setContact(savedDraft);
          setDisplayImagePath(savedContact.image_path ?? undefined);
          setRecoveredText(new Set());
          setShowOriginalText(false);
          setReviewState({
            status: 'success',
            parsed: {
              ...savedDraft,
              originalText: savedContact.raw_ocr_text ?? '',
              uncertainLines: [],
              filteredLines: [],
            },
          });
        } catch (error) {
          if (!isActive) return;
          console.error('Failed to load contact for editing:', error);
          setReviewState({
            status: 'error',
            message: 'The saved contact could not be loaded. Please try again.',
          });
        }
        return;
      }

      if (!imagePath) {
        setReviewState({ status: 'error', message: 'No card image was provided.' });
        return;
      }

      try {
        setDisplayImagePath(imagePath);
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

    void loadContactForm();

    return () => {
      isActive = false;
    };
  }, [attempt, contactId, imagePath]);

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

  const saveContact = async (sanitized: ContactDraft, parsed: ParsedContact) => {
    try {
      const editableContact = createEditableContactUpdate(sanitized);

      if (contactId !== undefined) {
        await updateSavedContact(contactRepository, contactId, editableContact);
        Alert.alert(
          'Contact updated',
          'Your changes were saved locally on this device.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
          { cancelable: false }
        );
        return;
      }

      const contactToSave: ContactInsert = {
        ...editableContact,
        image_path: imagePath ?? null,
        raw_ocr_text: parsed.originalText,
      };
      await contactRepository.insert(contactToSave);
      Alert.alert(
        'Contact saved',
        'The contact was saved locally on this device.',
        [{ text: 'OK', onPress: () => navigation.popToTop() }],
        { cancelable: false }
      );
    } catch (error) {
      console.error(contactId !== undefined ? 'Failed to update contact:' : 'Failed to save contact:', error);
      finishSaving();
      Alert.alert(
        contactId !== undefined ? 'Could not update contact' : 'Could not save contact',
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

    try {
      const duplicates = await contactRepository.findPotentialDuplicates(
        sanitized.phones,
        sanitized.emails,
        contactId
      );

      if (duplicates.length > 0) {
        Alert.alert(
          'Potential duplicate',
          `Matching saved contacts:\n\n${duplicates.map(describeDuplicate).join('\n')}`,
          [
            { text: 'Cancel', style: 'cancel', onPress: finishSaving },
            { text: 'Save Anyway', onPress: () => void saveContact(sanitized, parsed) },
          ],
          { cancelable: false }
        );
        return;
      }

      await saveContact(sanitized, parsed);
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
          <Text style={styles.heading}>{isEditMode ? 'Edit contact' : 'Review contact'}</Text>
          <Text style={styles.helperText}>
            {isEditMode
              ? 'Update any saved details, then save your changes.'
              : 'Check every field and correct anything the card reader classified incorrectly.'}
          </Text>

          <Text style={styles.groupLabel}>IDENTITY</Text>
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
          <View style={styles.groupDivider} />
          <Text style={styles.groupLabel}>CONTACT</Text>
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
          <View style={styles.groupDivider} />
          <Text style={styles.groupLabel}>ONLINE</Text>
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
          <View style={styles.groupDivider} />
          <Text style={styles.groupLabel}>ADDITIONAL</Text>
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

        {!isEditMode && (parsed.uncertainLines.length > 0 || filtered.length > 0) ? (
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

        {parsed.originalText ? (
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
        ) : null}

      </>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0} style={styles.screen}>
    <ScrollView contentContainerStyle={[styles.container, reviewState.status === 'success' && styles.containerWithActionBar]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {displayImagePath ? (
        <View style={styles.cardPreview}><BusinessCardPreview compact uri={displayImagePath} /></View>
      ) : null}

      {reviewState.status === 'processing' ? (
        <View style={styles.resultCard}>
          <View style={styles.centeredState}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
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
            <Text style={styles.stateTitle}>
              {isEditMode ? 'Could not load contact' : 'Could not read this card'}
            </Text>
            <Text style={styles.stateText}>{reviewState.message}</Text>
          </View>
        </View>
      ) : null}

      {reviewState.status !== 'processing' && reviewState.status !== 'success' ? (
        <TouchableOpacity style={styles.primaryButton} onPress={() => setAttempt((value) => value + 1)}>
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
      ) : null}

      {reviewState.status !== 'success' ? (
        <TouchableOpacity accessibilityRole="button" disabled={isSaving} onPress={() => navigation.goBack()} style={[styles.secondaryButton, isSaving && styles.disabledButton]}>
          <Text style={styles.secondaryButtonText}>{isEditMode ? 'Cancel' : 'Back to Scan'}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
    {reviewState.status === 'success' ? (
      <View style={[styles.actionBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <AppButton disabled={isSaving} label="Cancel" onPress={() => navigation.goBack()} style={styles.actionBarButton} variant="secondary" />
        <AppButton icon="checkmark" label={isEditMode ? 'Save changes' : 'Save contact'} loading={isSaving} onPress={() => void handleSave(reviewState.parsed)} style={styles.actionBarButton} />
      </View>
    ) : null}
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    padding: spacing.xl,
    backgroundColor: colors.canvas,
  },
  containerWithActionBar: { paddingBottom: 112 },
  cardPreview: { marginBottom: spacing.xl },
  resultCard: {
    marginBottom: 16,
    padding: 18,
    borderRadius: radii.surface,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heading: {
    marginBottom: 6,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  sectionTitle: {
    marginBottom: 4,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  helperText: {
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
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
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  recoveryRow: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recoveryTextContainer: {
    marginBottom: 8,
  },
  recoveryText: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  recoveryReason: {
    marginTop: 3,
    fontSize: 12,
    color: colors.textMuted,
  },
  recoverButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: colors.accentSoft,
  },
  disabledButton: {
    backgroundColor: colors.surfaceSubtle,
  },
  recoverButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  originalTextToggle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  extractedText: {
    marginTop: 14,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
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
    color: colors.text,
  },
  stateText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  primaryButton: {
    marginTop: 4,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  secondaryButton: {
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  groupLabel: { ...typography.label, color: colors.primary, letterSpacing: 0.9, marginBottom: spacing.md },
  groupDivider: { height: 1, backgroundColor: colors.border, marginTop: spacing.xs, marginBottom: spacing.xl },
  actionBar: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surfaceElevated },
  actionBarButton: { flex: 1 },
});

const useReviewStyles = () => {
  const { theme } = useAppTheme();
  return useMemo(() => createStyles(theme.colors), [theme.colors]);
};
