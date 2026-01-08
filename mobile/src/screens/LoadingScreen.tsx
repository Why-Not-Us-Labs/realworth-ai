import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getRandomQuestion, TriviaQuestion } from '../lib/triviaQuestions';
import { submitAppraisal } from '../services/appraisalService';

type Props = NativeStackScreenProps<RootStackParamList, 'Loading'>;

export function LoadingScreen({ route, navigation }: Props) {
  const { imageUri } = route.params;

  const [currentQuestion, setCurrentQuestion] = useState<TriviaQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Start appraisal process
  useEffect(() => {
    let isMounted = true;

    const processAppraisal = async () => {
      const result = await submitAppraisal(imageUri);

      if (!isMounted) return;

      if (result.success && result.appraisal) {
        // Navigate to result screen
        navigation.replace('Result', { appraisalId: result.appraisal.id });
      } else {
        setError(result.error || 'Failed to process appraisal');
        setIsProcessing(false);
      }
    };

    processAppraisal();

    return () => {
      isMounted = false;
    };
  }, [imageUri, navigation]);

  // Load first question
  useEffect(() => {
    const question = getRandomQuestion([]);
    setCurrentQuestion(question);
  }, []);

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setShowExplanation(true);
  };

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion) {
      const newAskedIds = [...askedQuestionIds, currentQuestion.id];
      setAskedQuestionIds(newAskedIds);
      const nextQuestion = getRandomQuestion(newAskedIds);
      setCurrentQuestion(nextQuestion);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  }, [currentQuestion, askedQuestionIds]);

  // Auto-advance to next question after showing explanation
  useEffect(() => {
    if (showExplanation && isProcessing) {
      const timer = setTimeout(() => {
        handleNextQuestion();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [showExplanation, isProcessing, handleNextQuestion]);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>!</Text>
          <Text style={styles.errorTitle}>Appraisal Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Analyzing Your Item</Text>
          <View style={styles.processingIndicator}>
            <ActivityIndicator size="small" color="#14B8A6" />
            <Text style={styles.processingText}>AI is working its magic...</Text>
          </View>
        </View>

        {/* Image Preview */}
        <View style={styles.imagePreview}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        </View>

        {/* Trivia Section */}
        {currentQuestion && (
          <View style={styles.triviaContainer}>
            <Text style={styles.triviaLabel}>While you wait...</Text>
            <Text style={styles.triviaQuestion}>{currentQuestion.question}</Text>

            <View style={styles.optionsContainer}>
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === currentQuestion.correctIndex;
                const showResult = selectedAnswer !== null;

                let buttonStyle = styles.optionButton;
                let textStyle = styles.optionText;

                if (showResult) {
                  if (isCorrect) {
                    buttonStyle = { ...styles.optionButton, ...styles.correctOption };
                    textStyle = { ...styles.optionText, ...styles.correctOptionText };
                  } else if (isSelected && !isCorrect) {
                    buttonStyle = { ...styles.optionButton, ...styles.wrongOption };
                    textStyle = { ...styles.optionText, ...styles.wrongOptionText };
                  }
                }

                return (
                  <TouchableOpacity
                    key={index}
                    style={buttonStyle}
                    onPress={() => handleAnswerSelect(index)}
                    disabled={selectedAnswer !== null}
                  >
                    <Text style={textStyle}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {showExplanation && (
              <View style={styles.explanationContainer}>
                <Text style={styles.explanationText}>
                  {currentQuestion.explanation}
                </Text>
              </View>
            )}
          </View>
        )}
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
    paddingVertical: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  processingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    fontSize: 14,
    color: '#64748B',
  },
  imagePreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  triviaContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  triviaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14B8A6',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  triviaQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 20,
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionText: {
    fontSize: 15,
    color: '#334155',
    textAlign: 'center',
  },
  correctOption: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
  },
  correctOptionText: {
    color: '#065F46',
    fontWeight: '600',
  },
  wrongOption: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  wrongOptionText: {
    color: '#991B1B',
  },
  explanationContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
  },
  explanationText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorIcon: {
    fontSize: 48,
    color: '#EF4444',
    marginBottom: 16,
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
});
