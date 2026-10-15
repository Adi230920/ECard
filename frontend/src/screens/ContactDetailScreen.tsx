import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ContactDetailsScreenProps } from '../types/navigation';
import { contactRepository } from '../database/contactRepository';
import type { Contact } from '../types/contact';
import {
  createContactDetailViewModel,
  type ContactDetailSection,
} from '../utils/contactDetails';

import {
  createEmailUrl,
  createLinkedInUrl,
  createPhoneUrl,
  createWebsiteUrl,
  createWhatsAppUrl,
  openContactUrl,
  type ContactQuickActionResult,
} from '../utils/contactQuickActions';
import { deleteSavedContact } from '../utils/contactEditing';
import { phonebookExportApi } from '../services/phonebookExportService';
import {
  createAsyncActionGuard,
  createPhonebookRecord,
  findPhonebookDuplicateMatches,
  hasDuplicateCheckValues,
  hasExportablePhonebookFields,
  resolvePhonebookPermission,
  scanAllAccessiblePhonebookContacts,
} from '../utils/phonebookExport';
import { AppButton } from '../components/ui/AppButton';
import { BusinessCardPreview } from '../components/cards/BusinessCardPreview';
import { useAppTheme } from '../theme/ThemeProvider';
import { layout, radii, spacing, typography, type ThemeColors } from '../theme/tokens';

type QuickAction = 'call' | 'email' | 'whatsapp' | 'website' | 'linkedin';

const actionDetails: Record<
  QuickAction,
  {
    label: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    createUrl: (value: string) => ContactQuickActionResult;
    unavailableMessage: string;
  }
> = {
  call: {
    label: 'Call',
    icon: 'call-outline',
    createUrl: createPhoneUrl,
    unavailableMessage: 'No phone application is available to open this number.',
  },
  email: {
    label: 'Email',
    icon: 'mail-outline',
    createUrl: createEmailUrl,
    unavailableMessage: 'No email application is available to open this address.',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: 'logo-whatsapp',
    createUrl: createWhatsAppUrl,
    unavailableMessage: 'WhatsApp or a compatible browser could not open this number.',
  },
  website: {
    label: 'Website',
    icon: 'globe-outline',
    createUrl: createWebsiteUrl,
    unavailableMessage: 'No browser is available to open this website.',
  },
  linkedin: {
    label: 'LinkedIn',
    icon: 'logo-linkedin',
    createUrl: createLinkedInUrl,
    unavailableMessage: 'LinkedIn or a compatible browser could not open this profile.',
  },
};

const sectionActions: Partial<Record<ContactDetailSection['key'], QuickAction[]>> = {
  phones: ['call', 'whatsapp'],
  emails: ['email'],
  website: ['website'],
  linkedin: ['linkedin'],
};

interface DetailSectionProps {
  section: ContactDetailSection;
  onAction: (action: QuickAction, value: string) => void;
}

const DetailSection = ({ section, onAction }: DetailSectionProps) => {
  const styles = useDetailStyles();
  const { theme } = useAppTheme();
  return <View style={styles.detailSection}>
    <Text style={styles.detailLabel}>{section.label}</Text>
    {section.values.map((value, index) => {
      const actions = sectionActions[section.key] ?? [];
      const primaryAction = actions[0];

      return (
        <View key={`${section.key}-${index}`} style={styles.detailRow}>
          {primaryAction ? (
            <TouchableOpacity
              accessibilityHint={`Opens ${actionDetails[primaryAction].label.toLowerCase()} for this value`}
              accessibilityLabel={`${actionDetails[primaryAction].label} ${value}`}
              accessibilityRole="link"
              onPress={() => onAction(primaryAction, value)}
              style={styles.detailValueButton}
            >
              <Text style={[styles.detailValue, styles.actionableDetailValue]}>{value}</Text>
            </TouchableOpacity>
          ) : (
            <Text selectable style={styles.detailValue}>
              {value}
            </Text>
          )}
          {actions.length > 0 ? (
            <View style={styles.actionGroup}>
              {actions.map((action) => {
                const details = actionDetails[action];
                return (
                  <TouchableOpacity
                    accessibilityHint={`Opens ${details.label.toLowerCase()} for this value`}
                    accessibilityLabel={`${details.label} ${value}`}
                    accessibilityRole="button"
                    key={action}
                    onPress={() => onAction(action, value)}
                    style={styles.actionButton}
                  >
                    <Ionicons color={theme.colors.primary} name={details.icon} size={18} style={styles.actionIcon} />
                    <Text style={styles.actionLabel}>{details.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </View>
      );
    })}
  </View>;
};

export const ContactDetailScreen = ({ route, navigation }: ContactDetailsScreenProps) => {
  const styles = useDetailStyles();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [imageExpanded, setImageExpanded] = useState(false);
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteActionLocked = useRef(false);
  const [isExporting, setIsExporting] = useState(false);
  const exportActionGuard = useRef(createAsyncActionGuard());

  useEffect(() => {
    if (!isFocused) return;

    let isActive = true;

    const loadContact = async () => {
      setLoading(true);
      setError(null);

      try {
        const savedContact = await contactRepository.getById(route.params.contactId);
        if (isActive) {
          setContact(savedContact);
          setImageExpanded(false);
          setImageUnavailable(false);
        }
      } catch (loadError) {
        console.error('Failed to load contact details:', loadError);
        if (isActive) {
          setContact(null);
          setError('Contact details could not be loaded. Please try again.');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void loadContact();

    return () => {
      isActive = false;
    };
  }, [isFocused, reloadToken, route.params.contactId]);

  if (loading) {
    return (
      <View style={styles.centeredState}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
        <Text style={styles.stateMessage}>Loading contact…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.stateTitle}>Unable to load contact</Text>
        <Text style={styles.stateMessage}>{error}</Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setReloadToken((current) => current + 1)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!contact) {
    return (
      <View style={styles.centeredState}>
        <Text style={styles.stateTitle}>Contact not found</Text>
        <Text style={styles.stateMessage}>
          This contact may no longer be available on this device.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const details = createContactDetailViewModel(contact);
  const hasProfileDetails = details.designation || details.company || details.sections.length > 0;

  const handleImageError = () => {
    setImageExpanded(false);
    setImageUnavailable(true);
  };

  const handleQuickAction = async (action: QuickAction, value: string) => {
    const details = actionDetails[action];
    const result = details.createUrl(value);

    if (!result.url) {
      Alert.alert(`Unable to open ${details.label}`, result.error);
      return;
    }

    const openResult = await openContactUrl(result.url, (url) => Linking.openURL(url));
    if (!openResult.opened) {
      console.error(`Failed to open ${action} action:`, openResult.error);
      Alert.alert(`Unable to open ${details.label}`, details.unavailableMessage);
    }
  };

  const handleEdit = () => {
    navigation.navigate('ReviewContact', { contactId: contact.id });
  };

  const deleteContact = async () => {
    setIsDeleting(true);

    try {
      await deleteSavedContact(contactRepository, contact.id);
      Alert.alert(
        'Contact deleted',
        'The saved contact was removed. Its card image was retained.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
        { cancelable: false }
      );
    } catch (deleteError) {
      console.error('Failed to delete contact:', deleteError);
      deleteActionLocked.current = false;
      setIsDeleting(false);
      Alert.alert('Could not delete contact', 'The contact is still saved. Please try again.');
    }
  };

  const handleDelete = () => {
    if (deleteActionLocked.current) return;
    deleteActionLocked.current = true;

    const cancelDeletion = () => {
      deleteActionLocked.current = false;
    };

    Alert.alert(
      'Delete contact?',
      'This permanently removes this contact from the app. The original card image will be retained.',
      [
        { text: 'Cancel', style: 'cancel', onPress: cancelDeletion },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteContact() },
      ],
      { cancelable: true, onDismiss: cancelDeletion }
    );
  };

  const confirmPhonebookExport = (title: string, message: string): Promise<boolean> =>
    new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Export Anyway', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });

  const performPhonebookExport = async () => {
    setIsExporting(true);

    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const record = createPhonebookRecord(contact, platform);

      if (!hasExportablePhonebookFields(record)) {
        Alert.alert(
          'Nothing to export',
          'This contact does not contain valid information supported by the phonebook.'
        );
        return;
      }

      const permission = await resolvePhonebookPermission(phonebookExportApi);
      if (permission.kind === 'denied') {
        Alert.alert(
          'Contacts permission denied',
          'Phonebook access is required to check duplicates and export this contact.'
        );
        return;
      }
      if (permission.kind === 'blocked') {
        Alert.alert(
          'Contacts permission unavailable',
          'Contacts access is denied or restricted. Enable it in device settings to export.'
        );
        return;
      }
      if (permission.kind === 'unavailable') {
        console.error('Phonebook permission check failed:', permission.error);
        Alert.alert(
          'Phonebook unavailable',
          'Device contacts could not be accessed on this device.'
        );
        return;
      }

      let warningTitle: string | undefined;
      let warningMessage: string | undefined;

      if (!hasDuplicateCheckValues(record)) {
        warningTitle = 'Duplicate check unavailable';
        warningMessage =
          'This contact has no valid phone number or email address to compare. An existing phonebook contact cannot be ruled out.';
      } else {
        const scan = await scanAllAccessiblePhonebookContacts(phonebookExportApi);
        const matches = findPhonebookDuplicateMatches(scan.contacts, record);
        const coverageIsLimited = permission.coverage === 'limited';

        if (matches.length > 0) {
          warningTitle = 'Potential phonebook duplicate';
          warningMessage = `${matches.length} accessible phonebook contact${
            matches.length === 1 ? '' : 's'
          } matched a phone number or email address. A new contact will be created without changing existing contacts.`;
        }

        if (!scan.complete || coverageIsLimited) {
          const incompleteReason = coverageIsLimited
            ? `Only ${scan.contacts.length} contacts shared with ECard could be checked.`
            : `Only ${scan.contacts.length} accessible contacts could be checked before the scan failed.`;
          warningTitle ??= 'Duplicate check incomplete';
          warningMessage = warningMessage
            ? `${warningMessage}\n\n${incompleteReason} Other duplicates cannot be ruled out.`
            : `${incompleteReason} Other duplicates cannot be ruled out.`;
        }
      }

      if (warningTitle && warningMessage) {
        const shouldExport = await confirmPhonebookExport(warningTitle, warningMessage);
        if (!shouldExport) {
          Alert.alert('Export cancelled', 'No phonebook contact was created.');
          return;
        }
      }

      await phonebookExportApi.createContact(record);
      Alert.alert('Contact exported', 'A new contact was added to your device phonebook.');
    } catch (exportError) {
      console.error('Failed to export contact to phonebook:', exportError);
      Alert.alert(
        'Could not export contact',
        'No phonebook contact was created. Please try again.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handlePhonebookExport = () => {
    void exportActionGuard.current.run(performPhonebookExport);
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerCard}>
          <Text selectable style={styles.contactName}>{details.displayName}</Text>
          {details.designation ? (
            <Text selectable style={styles.designation}>{details.designation}</Text>
          ) : null}
          {details.company ? (
            <Text selectable style={styles.company}>{details.company}</Text>
          ) : null}
        </View>

        <View style={styles.managementActions}>
          <AppButton disabled={isDeleting || isExporting} icon="create-outline" label="Edit" onPress={handleEdit} style={styles.managementButton} />
          <AppButton disabled={isDeleting} icon="person-add-outline" label="Phonebook" loading={isExporting} onPress={handlePhonebookExport} style={styles.managementButton} variant="secondary" />
        </View>

        {details.imagePath ? (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Original business card</Text>
            {imageUnavailable ? (
              <Text style={styles.unavailableText}>The saved card image is unavailable.</Text>
            ) : (
              <BusinessCardPreview onError={handleImageError} onPress={() => setImageExpanded(true)} uri={details.imagePath} />
            )}
          </View>
        ) : null}

        {details.sections.length > 0 ? (
          <View style={styles.cardSection}>
            {details.sections.map((section) => (
              <DetailSection
                key={section.key}
                onAction={(action, value) => void handleQuickAction(action, value)}
                section={section}
              />
            ))}
          </View>
        ) : null}

        {!hasProfileDetails && !details.imagePath ? (
          <View style={styles.cardSection}>
            <Text style={styles.unavailableText}>No additional contact information was saved.</Text>
          </View>
        ) : null}

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Contact management</Text>
          <Text style={styles.dangerDescription}>Deleting removes this contact from ECard. The original card image is retained.</Text>
          <AppButton disabled={isDeleting || isExporting} icon="trash-outline" label="Delete contact" loading={isDeleting} onPress={handleDelete} variant="danger" />
        </View>
      </ScrollView>

      {details.imagePath && !imageUnavailable ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setImageExpanded(false)}
          statusBarTranslucent
          transparent
          visible={imageExpanded}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              accessibilityLabel="Close enlarged business card"
              accessibilityRole="button"
              onPress={() => setImageExpanded(false)}
              style={[styles.closeButton, { top: insets.top + spacing.sm }]}
            >
              <Ionicons color="#FFFFFF" name="close" size={24} />
            </TouchableOpacity>
            <Image
              accessibilityLabel="Original business card enlarged"
              onError={handleImageError}
              resizeMode="contain"
              source={{ uri: details.imagePath }}
              style={styles.expandedImage}
            />
          </View>
        </Modal>
      ) : null}
    </>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
    backgroundColor: colors.canvas,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.canvas,
  },
  stateTitle: {
    marginBottom: 8,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  stateMessage: {
    marginTop: 12,
    marginBottom: 18,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.control,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  headerCard: {
    marginBottom: 16,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.lg,
  },
  contactName: {
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 31,
    color: colors.text,
  },
  designation: {
    marginTop: 8,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  company: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    color: colors.text,
  },
  managementActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: 16,
  },
  managementButton: { flexGrow: 1, minWidth: 148 },
  cardSection: {
    marginBottom: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.surface,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  detailSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailRow: {
    paddingBottom: 8,
  },
  detailLabel: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  detailValue: {
    marginBottom: 8,
    fontSize: 16,
    lineHeight: 23,
    color: colors.text,
  },
  detailValueButton: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
  },
  actionableDetailValue: {
    color: colors.primary,
  },
  actionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  actionIcon: {
    minWidth: 20,
    marginRight: 5,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  unavailableText: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 1,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  expandedImage: {
    width: '100%',
    height: '80%',
  },
  dangerSection: { marginTop: spacing.xl, paddingTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border },
  dangerTitle: { ...typography.contact, color: colors.text },
  dangerDescription: { ...typography.secondary, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
});

const useDetailStyles = () => {
  const { theme } = useAppTheme();
  return useMemo(() => createStyles(theme.colors), [theme.colors]);
};
