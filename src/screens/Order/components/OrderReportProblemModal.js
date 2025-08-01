import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../../utils/colors';
import api from '../../../utils/api';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { useSelector} from 'react-redux';

const OrderReportProblemModal = ({ visible, onClose, order }) => {
  const { t } = useTranslation();
  const [reportText, setReportText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const navigation = useNavigation();
  const currentUser = useSelector(state => state?.user?.currentUser);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      await api.put(`commands/${order.documentId}`, {
        data: { SpecificNote: reportText, }
      });
     
    const rep=await  api.post("tickets",{
        data:{
          description:reportText,
          client:currentUser.id,
          command:order.id,

        }
      })
    
      onClose();
      Toast.show({
        type: 'success',
        text1: t('history.card.report_success'),
        position: 'bottom',
      });
      setReportText('');
    } catch (error) {
      console.log(error.response);
      Toast.show({
        type: 'error',
        text1: t('history.card.report_error'),
        position: 'bottom',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={() => {
        Keyboard.dismiss();
        onClose();
      }}
      onBackButtonPress={() => {
        Keyboard.dismiss();
        onClose();
      }}
      style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      avoidKeyboard
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.reportModalContainer}>
          <View style={styles.reportModalHeader}>
            <Text style={styles.reportModalTitle}>{t('history.card.report_problem')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.reportTextArea}
            multiline
            numberOfLines={6}
            placeholder={t('history.card.report_placeholder')}
            value={reportText}
            onChangeText={setReportText}
            textAlignVertical="top"
          />
          <TouchableOpacity 
            style={[styles.submitReportButton, isLoading && styles.submitReportButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitReportButtonText}>{t('history.card.submit_report')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  reportModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  reportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  reportTextArea: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 150,
    marginBottom: 20,
     color:"#000"
  },
  submitReportButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitReportButtonDisabled: {
    opacity: 0.7,
  },
  rateButton: {
    backgroundColor: colors.secondary,
  },
  submitReportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default OrderReportProblemModal; 