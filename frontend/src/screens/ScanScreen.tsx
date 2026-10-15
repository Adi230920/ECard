import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScanScreenProps } from '../types/navigation';
import { saveCardImage } from '../utils/imageStorage';
import { AppButton } from '../components/ui/AppButton';
import { useAppTheme } from '../theme/ThemeProvider';
import { radii, spacing, typography } from '../theme/tokens';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const clamp = (value: number, minimum: number, maximum: number) => {
  'worklet';
  return Math.min(Math.max(value, minimum), maximum);
};

export const ScanScreen = ({ navigation }: ScanScreenProps) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const scale = useSharedValue(MIN_ZOOM);
  const savedScale = useSharedValue(MIN_ZOOM);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const savedTranslationX = useSharedValue(0);
  const savedTranslationY = useSharedValue(0);
  const frameWidth = Math.min(width - spacing.huge, 520);

  const resetZoom = () => {
    scale.value = MIN_ZOOM; savedScale.value = MIN_ZOOM;
    translationX.value = 0; translationY.value = 0;
    savedTranslationX.value = 0; savedTranslationY.value = 0;
  };

  const pinchGesture = Gesture.Pinch().enabled(!isProcessing).onUpdate((event) => {
    scale.value = clamp(savedScale.value * event.scale, MIN_ZOOM, MAX_ZOOM);
  }).onEnd(() => {
    savedScale.value = scale.value;
    const maxX = (width * (scale.value - MIN_ZOOM)) / 2;
    const maxY = (height * (scale.value - MIN_ZOOM)) / 2;
    const nextX = clamp(translationX.value, -maxX, maxX);
    const nextY = clamp(translationY.value, -maxY, maxY);
    translationX.value = withTiming(nextX); translationY.value = withTiming(nextY);
    savedTranslationX.value = nextX; savedTranslationY.value = nextY;
  });
  const panGesture = Gesture.Pan().enabled(!isProcessing).onUpdate((event) => {
    if (scale.value <= MIN_ZOOM) return;
    const maxX = (width * (scale.value - MIN_ZOOM)) / 2;
    const maxY = (height * (scale.value - MIN_ZOOM)) / 2;
    translationX.value = clamp(savedTranslationX.value + event.translationX, -maxX, maxX);
    translationY.value = clamp(savedTranslationY.value + event.translationY, -maxY, maxY);
  }).onEnd(() => {
    savedTranslationX.value = translationX.value; savedTranslationY.value = translationY.value;
  });
  const previewStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translationX.value }, { translateY: translationY.value }, { scale: scale.value }] }));

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) { resetZoom(); setCapturedImage(photo.uri); }
    } catch (error) { Alert.alert('Could not capture card', 'Please try taking the photo again.'); console.error(error); }
  };
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled && result.assets.length > 0) { resetZoom(); setCapturedImage(result.assets[0].uri); }
    } catch (error) { Alert.alert('Could not open gallery', 'Please try selecting the image again.'); console.error(error); }
  };
  const handleRotate = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    try {
      const result = await ImageManipulator.manipulateAsync(capturedImage, [{ rotate: 90 }], { compress: 1, format: ImageManipulator.SaveFormat.JPEG });
      resetZoom(); setCapturedImage(result.uri);
    } catch (error) { Alert.alert('Could not rotate image', 'Please try again.'); console.error(error); }
    finally { setIsProcessing(false); }
  };
  const handleUsePhoto = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    try { navigation.navigate('ReviewContact', { imagePath: await saveCardImage(capturedImage) }); }
    catch { Alert.alert('Could not save image', 'The photo is still available. Please try again.'); }
    finally { setIsProcessing(false); }
  };

  if (!permission) return <View style={[styles.centered, { backgroundColor: theme.colors.canvas }]}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;
  if (!permission.granted) {
    return (
      <View style={[styles.permission, { backgroundColor: theme.colors.canvas }]}>
        <View style={[styles.permissionIcon, { backgroundColor: theme.colors.primarySoft }]}><Ionicons color={theme.colors.primary} name="camera-outline" size={32} /></View>
        <Text style={[styles.permissionTitle, { color: theme.colors.text }]}>Camera access is needed</Text>
        <Text style={[styles.permissionText, { color: theme.colors.textSecondary }]}>ECard uses the camera only to capture a business card for on-device text recognition.</Text>
        {permission.canAskAgain ? <AppButton icon="camera-outline" label="Allow camera" onPress={() => void requestPermission()} style={styles.permissionButton} /> : null}
        <AppButton icon="images-outline" label="Choose from gallery" onPress={() => void handlePickFromGallery()} variant="secondary" style={styles.permissionButton} />
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.camera }]}>
        <View style={styles.previewContainer}>
          <GestureDetector gesture={Gesture.Simultaneous(pinchGesture, panGesture)}>
            <Animated.View style={styles.gestureSurface}><Animated.Image source={{ uri: capturedImage }} style={[styles.preview, previewStyle]} resizeMode="contain" /></Animated.View>
          </GestureDetector>
          <View style={styles.previewTopBar}>
            <View style={styles.previewHint}><Ionicons color="#FFFFFF" name="resize-outline" size={16} /><Text style={styles.previewHintText}>Pinch to inspect</Text></View>
            <Pressable accessibilityLabel="Rotate photo clockwise" accessibilityRole="button" disabled={isProcessing} onPress={() => void handleRotate()} style={({ pressed }) => [styles.overlayButton, pressed && styles.pressed]}>
              <Ionicons color="#FFFFFF" name="refresh" size={22} /><Text style={styles.overlayButtonText}>Rotate</Text>
            </Pressable>
          </View>
        </View>
        <View style={[styles.actionTray, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <AppButton disabled={isProcessing} icon="camera-reverse-outline" label="Retake" onPress={() => { resetZoom(); setCapturedImage(null); }} style={styles.actionButton} variant="secondary" />
          <AppButton icon="checkmark" label="Use photo" loading={isProcessing} onPress={() => void handleUsePhoto()} style={styles.actionButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.camera }]}>
      {Platform.OS === 'web' ? <View style={[styles.camera, styles.centered]}><Text style={styles.cameraMessage}>Camera is unavailable in the web preview.</Text></View> : <CameraView ref={cameraRef} facing="back" style={styles.camera} />}
      <View pointerEvents="none" style={styles.guideLayer}>
        <Text style={styles.guideTitle}>Align the card inside the frame</Text>
        <Text style={styles.guideText}>Keep all four edges visible and avoid glare</Text>
        <View style={[styles.frame, { width: frameWidth, height: frameWidth / 1.586 }]}>
          <View style={[styles.corner, styles.topLeft]} /><View style={[styles.corner, styles.topRight]} /><View style={[styles.corner, styles.bottomLeft]} /><View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>
      <View style={[styles.captureTray, { paddingBottom: Math.max(insets.bottom + spacing.md, spacing.xxl) }]}>
        <Pressable accessibilityLabel="Choose card image from gallery" accessibilityRole="button" onPress={() => void handlePickFromGallery()} style={({ pressed }) => [styles.galleryButton, pressed && styles.pressed]}>
          <Ionicons color="#FFFFFF" name="images-outline" size={24} /><Text style={styles.controlLabel}>Gallery</Text>
        </Pressable>
        <Pressable accessibilityLabel="Capture business card" accessibilityRole="button" disabled={Platform.OS === 'web'} onPress={() => void handleCapture()} style={({ pressed }) => [styles.captureButton, pressed && styles.capturePressed, Platform.OS === 'web' && styles.disabled]}><View style={styles.captureInner} /></Pressable>
        <View style={styles.controlSpacer} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  permissionIcon: { width: 72, height: 72, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  permissionTitle: { ...typography.title, textAlign: 'center' },
  permissionText: { ...typography.body, textAlign: 'center', maxWidth: 420, marginTop: spacing.sm, marginBottom: spacing.xl },
  permissionButton: { width: '100%', maxWidth: 420, marginTop: spacing.md },
  camera: { flex: 1 },
  cameraMessage: { ...typography.body, color: '#FFFFFF', textAlign: 'center' },
  guideLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: 90 },
  guideTitle: { ...typography.body, color: '#FFFFFF', fontWeight: '700', textAlign: 'center', textShadowColor: '#000000', textShadowRadius: 4 },
  guideText: { ...typography.secondary, color: 'rgba(255,255,255,0.84)', marginTop: 2, marginBottom: spacing.xxl, textAlign: 'center' },
  frame: { borderRadius: radii.control, backgroundColor: 'rgba(255,255,255,0.04)' },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: '#E0AE62' },
  topLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: radii.control },
  topRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: radii.control },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: radii.control },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: radii.control },
  captureTray: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 124, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: spacing.lg, paddingHorizontal: spacing.xxl, backgroundColor: 'rgba(8,11,10,0.76)' },
  galleryButton: { width: 72, minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  controlLabel: { ...typography.label, color: '#FFFFFF', marginTop: spacing.xs },
  controlSpacer: { width: 72 },
  captureButton: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' },
  captureInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' },
  capturePressed: { transform: [{ scale: 0.95 }] },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.7 },
  previewContainer: { flex: 1, overflow: 'hidden' },
  gestureSurface: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  preview: { width: '100%', flex: 1, backgroundColor: '#080B0A' },
  previewTopBar: { position: 'absolute', top: spacing.lg, left: spacing.lg, right: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewHint: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, minHeight: 40, borderRadius: radii.pill, backgroundColor: 'rgba(0,0,0,0.48)' },
  previewHintText: { ...typography.label, color: '#FFFFFF', marginLeft: spacing.xs },
  overlayButton: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.pill, backgroundColor: 'rgba(0,0,0,0.58)', flexDirection: 'row', alignItems: 'center' },
  overlayButtonText: { ...typography.secondary, color: '#FFFFFF', fontWeight: '700', marginLeft: spacing.xs },
  actionTray: { flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth },
  actionButton: { flex: 1 },
});
