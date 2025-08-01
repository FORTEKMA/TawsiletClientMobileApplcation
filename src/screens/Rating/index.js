import React, {useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  View,
  Platform,
  SafeAreaView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import api from '../../utils/api';
import Toast from 'react-native-toast-message';
import {useDispatch, useSelector} from 'react-redux';
import {createReview} from '../../store/reviewSlice/reviewSlice';
import {StarRatingSection} from './components/StarRatingSection';
import {CommentSection} from './components/CommentSection';
import {SubmitButton} from './components/SubmitButton';
import {FeedbackTags} from './components/FeedbackTags';
import {styles} from './styles';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {colors} from '../../utils/colors';
 import {useTranslation} from 'react-i18next';
import {updateHasReview} from "../../store/userSlice/userSlice"
import { 
  trackScreenView, 
  trackRatingSubmitted, 
  trackRatingSkipped 
} from '../../utils/analytics';

const Rating = ({route}) => {
  const {t} = useTranslation();
  const [rating, setRating] = useState(0);
  const [messageText, setMessageText] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.user.currentUser);
  const {order} = route.params;

  // Track screen view on mount
  useEffect(() => {
    trackScreenView('Rating', { 
      order_id: order?.id,
      has_existing_review: !!order?.review
    });
  }, []);

useEffect(()=>{
  dispatch(updateHasReview(order))
 
},[])

  const handleSubmit = async () => {
   
    if (rating === 0) {
      // Track rating skipped
      trackRatingSkipped(order?.id);
      // You might want to show an error message here
      return;
    }
    setIsSubmitting(true);
    try {
     const response = await api.post(`reviews/`, {data:{
        note:selectedTags[0] === 'Other' ? messageText : selectedTags[0],
        score: rating,
        command: order?.id,
        driver: order?.driver?.id,
        client: currentUser.id,}
      }) 
      
      // Track successful rating submission
      trackRatingSubmitted(rating, order?.id, {
        feedback_tag: selectedTags[0],
        has_custom_comment: selectedTags[0] === 'Other',
        driver_id: order?.driver?.id
      });
      
      dispatch(updateHasReview(null))
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
      Toast.show({
        type: 'success',
        text1: t('rating.success'),
        position: 'top',
        visibilityTime: 3000,
      });
    } catch (error) {
      console.log(error.response.data);
    } finally {
      setIsSubmitting(false);
    }
  };
 
  const showCommentSection = selectedTags[0] === 'Other';
 
  return (
    <SafeAreaView style={[styles.safeArea, {backgroundColor: colors.primary, flex: 1}]}> 
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{flex: 1}}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary}}>
            <View style={{backgroundColor: 'white', borderRadius: 18, padding: 28, width: '92%', maxWidth: 400, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4}}>
              <Text style={{fontSize: 22, fontWeight: '600', color: '#222', marginBottom: 18, textAlign: 'center'}}>{t('rating.title')}</Text>
               <StarRatingSection
                rating={rating}
                setRating={setRating}
                existingRating={order?.review?.data?.score}
              />
              <Text style={{fontSize: 16, color: colors.gray, marginTop: 10, marginBottom: 2, textAlign: 'center'}}>{t('rating.leave_feedback')}</Text>
              <FeedbackTags selectedTags={selectedTags} setSelectedTags={setSelectedTags} />
              {selectedTags[0] === 'Other' && (
                <CommentSection
                  messageText={messageText}
                  setMessageText={setMessageText}
                  existingMessage={order?.review?.data?.message}
                  placeholder={t('rating.type_comment')}
                />
              )}
              <SubmitButton
                onSubmit={handleSubmit}
                isAlreadyRated={order?.review != undefined}
                isLoading={isSubmitting}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Rating; 