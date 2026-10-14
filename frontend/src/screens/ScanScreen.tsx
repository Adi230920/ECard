import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ActivityIndicator, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ScanScreenProps } from '../types/navigation';
import { saveCardImage } from '../utils/imageStorage';

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
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const scale = useSharedValue(MIN_ZOOM);
  const savedScale = useSharedValue(MIN_ZOOM);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const savedTranslationX = useSharedValue(0);
  const savedTranslationY = useSharedValue(0);

  const resetZoom = () => {
    scale.value = MIN_ZOOM;
    savedScale.value = MIN_ZOOM;
    translationX.value = 0;
    translationY.value = 0;
    savedTranslationX.value = 0;
    savedTranslationY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .enabled(!isProcessing)
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, MIN_ZOOM, MAX_ZOOM);
    })
    .onEnd(() => {
      savedScale.value = scale.value;

      const maxX = (viewportWidth * (scale.value - MIN_ZOOM)) / 2;
      const maxY = (viewportHeight * (scale.value - MIN_ZOOM)) / 2;
      const nextX = clamp(translationX.value, -maxX, maxX);
      const nextY = clamp(translationY.value, -maxY, maxY);

      translationX.value = withTiming(nextX);
      translationY.value = withTiming(nextY);
      savedTranslationX.value = nextX;
      savedTranslationY.value = nextY;
    });

  const panGesture = Gesture.Pan()
    .enabled(!isProcessing)
    .onUpdate((event) => {
      if (scale.value <= MIN_ZOOM) return;

      const maxX = (viewportWidth * (scale.value - MIN_ZOOM)) / 2;
      const maxY = (viewportHeight * (scale.value - MIN_ZOOM)) / 2;
      translationX.value = clamp(savedTranslationX.value + event.translationX, -maxX, maxX);
      translationY.value = clamp(savedTranslationY.value + event.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      savedTranslationX.value = translationX.value;
      savedTranslationY.value = translationY.value;
    });

  const previewGesture = Gesture.Simultaneous(pinchGesture, panGesture);
  const previewStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: scale.value },
    ],
  }));

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo && photo.uri) {
        resetZoom();
        setCapturedImage(photo.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture image');
      console.error(error);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        resetZoom();
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from gallery');
      console.error(error);
    }
  };

  const handleRetake = () => {
    resetZoom();
    setCapturedImage(null);
  };

  const handleRotate = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    try {
      const manipResult = await ImageManipulator.manipulateAsync(
        capturedImage,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      resetZoom();
      setCapturedImage(manipResult.uri);
    } catch (error) {
      Alert.alert('Error', 'Failed to rotate image');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUsePhoto = async () => {
    if (!capturedImage) return;
    setIsProcessing(true);
    try {
      const savedPath = await saveCardImage(capturedImage);
      navigation.navigate('ReviewContact', { imagePath: savedPath });
    } catch {
      Alert.alert('Error', 'Failed to save image');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={handlePickFromGallery}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Choose from Gallery</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <GestureDetector gesture={previewGesture}>
            <Animated.View style={styles.gestureSurface}>
              <Animated.Image
                source={{ uri: capturedImage }}
                style={[styles.preview, previewStyle]}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>

          <TouchableOpacity style={styles.rotateButton} onPress={handleRotate} disabled={isProcessing}>
            <Text style={styles.rotateButtonText}>↻ Rotate</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.retakeButton]} onPress={handleRetake} disabled={isProcessing}>
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleUsePhoto} disabled={isProcessing}>
            {isProcessing ? (
               <ActivityIndicator color="#FFFFFF" />
            ) : (
               <Text style={styles.buttonText}>Use Photo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
         <View style={[styles.camera, { justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={styles.message}>Camera not supported in web preview.</Text>
         </View>
      ) : (
         <CameraView style={styles.camera} ref={cameraRef} facing="back" />
      )}
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.captureButton} onPress={handleCapture} disabled={Platform.OS === 'web'}>
          <View style={styles.captureInner} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryButton} onPress={handlePickFromGallery}>
          <Text style={styles.galleryButtonText}>Gallery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    fontSize: 16,
    color: '#495057',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
    position: 'relative',
  },
  gestureSurface: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rotateButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 10,
  },
  rotateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  preview: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000000',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
  },
  galleryButton: {
    position: 'absolute',
    right: 30,
  },
  galleryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  retakeButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#CED4DA',
  },
  retakeButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
});
