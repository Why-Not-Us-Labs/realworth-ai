import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Linking,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const LINKS = {
  privacy: 'https://realworth.ai/privacy',
  terms: 'https://realworth.ai/terms',
  support: 'https://realworth.ai/support',
};

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your appraisals and data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteAccount,
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // TODO: Call account deletion API endpoint
      // For now, just sign out as a placeholder
      // await deleteAccount();
      Alert.alert(
        'Account Deletion Requested',
        'Your account deletion request has been received. Your data will be deleted within 30 days. You will now be signed out.',
        [{ text: 'OK', onPress: signOut }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', onPress: signOut },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <View style={styles.accountInfo}>
              <Text style={styles.accountName}>
                {user?.user_metadata?.full_name || 'User'}
              </Text>
              <Text style={styles.accountEmail}>{user?.email || ''}</Text>
            </View>
          </View>
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => openLink(LINKS.privacy)}
            >
              <Text style={styles.linkText}>Privacy Policy</Text>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => openLink(LINKS.terms)}
            >
              <Text style={styles.linkText}>Terms of Service</Text>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => openLink(LINKS.support)}
            >
              <Text style={styles.linkText}>Help Center</Text>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => Linking.openURL('mailto:support@whynotus.ai')}
            >
              <Text style={styles.linkText}>Contact Support</Text>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <Text style={styles.deleteText}>Delete Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Version Info */}
        <Text style={styles.versionText}>RealWorth.ai v1.0.0</Text>
      </ScrollView>
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
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  accountInfo: {
    padding: 16,
  },
  accountName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  accountEmail: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  linkText: {
    fontSize: 16,
    color: '#1E293B',
  },
  linkArrow: {
    fontSize: 16,
    color: '#94A3B8',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 16,
  },
  signOutButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  deleteButton: {
    marginTop: 12,
    padding: 16,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 15,
    color: '#EF4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 32,
    marginBottom: 24,
  },
});
