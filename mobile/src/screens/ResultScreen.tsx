import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getAppraisal, AppraisalResult } from '../services/appraisalService';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ResultScreen({ route, navigation }: Props) {
  const { appraisalId } = route.params;

  const [appraisal, setAppraisal] = useState<AppraisalResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppraisal = async () => {
      const result = await getAppraisal(appraisalId);
      if (result.success && result.appraisal) {
        setAppraisal(result.appraisal);
      } else {
        setError(result.error || 'Failed to load appraisal');
      }
      setIsLoading(false);
    };

    fetchAppraisal();
  }, [appraisalId]);

  const handleShare = async () => {
    if (!appraisal) return;

    const priceRange = `${formatCurrency(appraisal.price_low)} - ${formatCurrency(appraisal.price_high)}`;
    const shareUrl = `https://realworth.ai/treasure/${appraisalId}`;

    try {
      await Share.share({
        message: `Check out my ${appraisal.item_name} appraisal on RealWorth! Estimated value: ${priceRange}\n\n${shareUrl}`,
        url: shareUrl,
      });
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  const handleNewAppraisal = () => {
    navigation.navigate('Home');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14B8A6" />
          <Text style={styles.loadingText}>Loading appraisal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !appraisal) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorMessage}>{error || 'Something went wrong'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleNewAppraisal}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const priceRange = `${formatCurrency(appraisal.price_low)} - ${formatCurrency(appraisal.price_high)}`;
  const midPrice = (appraisal.price_low + appraisal.price_high) / 2;

  // Value tier messaging
  let valueTier: 'modest' | 'notable' | 'valuable' | 'treasure' = 'modest';
  if (midPrice >= 10000) valueTier = 'treasure';
  else if (midPrice >= 1000) valueTier = 'valuable';
  else if (midPrice >= 100) valueTier = 'notable';

  const tierMessages = {
    modest: { emoji: '💡', message: 'Every item has a story!' },
    notable: { emoji: '✨', message: 'Nice find!' },
    valuable: { emoji: '🌟', message: 'You\'ve got something special!' },
    treasure: { emoji: '💎', message: 'Incredible treasure!' },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Celebration Header */}
        <View style={styles.celebrationHeader}>
          <Text style={styles.celebrationEmoji}>{tierMessages[valueTier].emoji}</Text>
          <Text style={styles.celebrationMessage}>{tierMessages[valueTier].message}</Text>
        </View>

        {/* Item Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: appraisal.ai_image_url || appraisal.image_url }}
            style={styles.itemImage}
            resizeMode="cover"
          />
        </View>

        {/* Item Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.itemName}>{appraisal.item_name}</Text>

          {appraisal.author && (
            <Text style={styles.itemAuthor}>by {appraisal.author}</Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaTag}>
              <Text style={styles.metaTagText}>{appraisal.category}</Text>
            </View>
            {appraisal.era && (
              <View style={styles.metaTag}>
                <Text style={styles.metaTagText}>{appraisal.era}</Text>
              </View>
            )}
          </View>

          {/* Price Range */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Estimated Value</Text>
            <Text style={styles.priceRange}>{priceRange}</Text>
          </View>

          {/* Description */}
          {appraisal.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.sectionText}>{appraisal.description}</Text>
            </View>
          )}

          {/* Reasoning */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why This Value?</Text>
            <Text style={styles.sectionText}>{appraisal.reasoning}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.newAppraisalButton} onPress={handleNewAppraisal}>
            <Text style={styles.newAppraisalButtonText}>New Appraisal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#14B8A6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  celebrationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  celebrationMessage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  itemImage: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  itemAuthor: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  metaTag: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  metaTagText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  priceContainer: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 13,
    color: '#047857',
    fontWeight: '500',
    marginBottom: 4,
  },
  priceRange: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#14B8A6',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14B8A6',
  },
  newAppraisalButton: {
    flex: 1,
    backgroundColor: '#14B8A6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  newAppraisalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
