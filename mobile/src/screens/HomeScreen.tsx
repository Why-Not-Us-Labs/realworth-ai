import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

function SettingsIcon() {
  return (
    <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20 }}>⚙️</Text>
    </View>
  );
}

export function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [isPickingImage, setIsPickingImage] = useState(false);

  const handleImageResponse = (response: ImagePickerResponse) => {
    setIsPickingImage(false);

    if (response.didCancel) {
      return;
    }

    if (response.errorCode) {
      Alert.alert('Error', response.errorMessage || 'Failed to pick image');
      return;
    }

    const asset = response.assets?.[0];
    if (asset?.uri) {
      navigation.navigate('Loading', { imageUri: asset.uri });
    }
  };

  const handleTakePhoto = () => {
    setIsPickingImage(true);
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
      },
      handleImageResponse
    );
  };

  const handleChooseFromLibrary = () => {
    setIsPickingImage(true);
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
      },
      handleImageResponse
    );
  };

  const showImageOptions = () => {
    Alert.alert(
      'Add Photo',
      'How would you like to add your item?',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handleChooseFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>
                Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}!
              </Text>
              <Text style={styles.subtitle}>What would you like to appraise today?</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <SettingsIcon />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Action - Camera Button */}
        <View style={styles.cameraContainer}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={showImageOptions}
            disabled={isPickingImage}
          >
            {isPickingImage ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.cameraIcon}>📷</Text>
                <Text style={styles.cameraText}>Take Photo</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.cameraHint}>
            Snap a photo of any item to get an instant AI appraisal
          </Text>
        </View>

        {/* Usage Stats - Placeholder */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Appraisals</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Free Left</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
  },
  settingsButton: {
    padding: 8,
    marginLeft: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
  },
  cameraContainer: {
    alignItems: 'center',
    marginVertical: 48,
  },
  cameraButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cameraIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  cameraText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraHint: {
    marginTop: 16,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 32,
  },
  statBox: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14B8A6',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
});
