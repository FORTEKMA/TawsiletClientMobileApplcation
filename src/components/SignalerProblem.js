import React, {useState} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker'; // Import DocumentPicker
import Icon from 'react-native-vector-icons/FontAwesome'; // For the attachment icon
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {colors} from '../utils/colors';
import {useSelector} from 'react-redux';
import {ScrollView} from 'react-native-gesture-handler';
// Custom Badge component to replace native-base Badge
const Badge = ({ children, colorScheme, style }) => {
  const getBadgeColor = (scheme) => {
    switch (scheme) {
      case 'yellow':
        return '#F59E0B';
      case 'purple':
        return '#8B5CF6';
      case 'green':
        return '#10B981';
      case 'cyan':
        return '#06B6D4';
      case 'orange':
        return '#F97316';
      case 'teal':
        return '#14B8A6';
      case 'pink':
        return '#EC4899';
      case 'red':
        return '#EF4444';
      case 'gray':
      default:
        return '#6B7280';
    }
  };

  return (
    <View
      style={[
        {
          backgroundColor: getBadgeColor(colorScheme),
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}>
      <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
        {children}
      </Text>
    </View>
  );
};

const start = require('../assets/historyStart.png');
const end = require('../assets/historyArrive.png');
 
const SignalerProblem = () => {
  const [problemModalVisible, setProblemModalVisible] = useState(false);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');
  const [attachment, setAttachment] = useState(null); // State to store the selected file

  const order = useSelector(state => state?.commandes?.OrderById);

  // Function to handle file selection
  const handleAttachment = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles], // Allow all file types
      });
      setAttachment(res[0]); // Store the selected file in state
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled the file picker');
      } else {
        console.log('Error picking file:', err);
      }
    }
  };

  const handleSubmit = () => {
    // Handle the form submission logic here (e.g., API call)
    setProblemModalVisible(false);
    setAlertModalVisible(true);
  };

  const getStatusBadgeColor = status => {
    switch (status) {
      case 'Assigned_to_driver':
        return 'yellow';
      case 'Driver_on_route_to_pickup':
        return 'purple';
      case 'Arrived_at_pickup':
        return 'green';
      case 'Picked_up':
        return 'cyan';
      case 'On_route_to_delivery':
        return 'orange';
      case 'Arrived_at_delivery':
        return 'teal';
      case 'Delivered':
        return 'pink';
      case 'Completed':
        return 'green';
      case 'Failed_pickup':
        return 'red';
      case 'Failed_delivery':
        return 'red';
      case 'Canceled_by_partner':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusText = status => {
    switch (status) {
      case 'Pending':
        return 'En attente';
      case 'Dispatched_to_partner':
        return 'Acceptée';
      case 'Assigned_to_driver':
        return 'Livreur en route vers rammassage';
      case 'Driver_on_route_to_pickup':
        return 'Livreur en route vers rammassage';
      case 'Arrived_at_pickup':
        return 'Arrivée au ramassage';
      case 'Picked_up':
        return 'Commande ramassée';
      case 'On_route_to_delivery':
        return 'Livreur en route vers livraison';
      case 'Arrived_at_delivery':
        return 'Arrivée au dépot';
      case 'Delivered':
        return 'Terminé';
      case 'Completed':
        return 'Livrée';
      case 'Failed_pickup':
        return 'Commande Annulé !Contactez le support';
      case 'Failed_delivery':
        return 'Commande Annulé !Contactez le support';
      case 'Canceled_by_partner':
        return 'Commande Annulé !Contactez le support';
      default:
        return 'Inconnu';
    }
  };

  return (
    <View style={styles.container}>
      {/* Button to open the "Signaler un problème" modal */}
      <TouchableOpacity
        style={styles.problemButton}
        onPress={() => setProblemModalVisible(true)}>
        <Text style={styles.problemButtonText}>Signaler un problème</Text>
      </TouchableOpacity>

      {/* "Signaler un problème" Modal */}
      <Modal
        transparent={true}
        visible={problemModalVisible}
        animationType="slide"
        onRequestClose={() => setProblemModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.alertTextee}>
              Adresse de dépose / de ramassage
            </Text>

            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                width: '100%',
                height: '40%',
                marginTop: 10,
                gap: 40,
              }}>
              <View
                style={{
                  flex: 0.3,
                  paddingLeft: 2,
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                }}>
                <Image source={start} width={7} height={7} />
                <View style={{flex: 1, overflow: 'hidden', paddingLeft: 10}}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.secondary_1,
                      fontWeight: '600',
                      fontSize: 11,
                    }}>
                    {order?.pickUpAcces?.options}{' '}
                    {order?.pickUpAcces?.floor > 0
                      ? order?.pickUpAcces?.floor + ' étage'
                      : null}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.primary,
                      fontWeight: 600,
                      fontSize: 13,
                    }}>
                    {order?.pickUpAddress?.Address}
                  </Text>
                </View>
                <View>
                  <Text style={{color: colors.secondary_1, fontSize: 13}}>
                    {order?.departDate}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flex: 0.3,
                  paddingLeft: 4,
                  flexDirection: 'row',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                }}>
                <Image source={end} />
                <View style={{flex: 1, overflow: 'hidden', paddingLeft: 10}}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.secondary_1,
                      fontWeight: '600',
                      fontSize: 11,
                    }}>
                    {order?.dropAcces?.options}{' '}
                    {order?.dropAcces?.floor > 0
                      ? order?.dropAcces?.floor + ' étage'
                      : null}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: colors.primary,
                      fontWeight: '600',
                      fontSize: 13,
                    }}>
                    {order?.dropOfAddress?.Address}
                  </Text>
                </View>
                <View>
                  <Text style={{color: colors.secondary_1, fontSize: 13}}>
                    {order?.deparTime}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.containerr}>
              <Badge
                colorScheme={getStatusBadgeColor(order?.commandStatus)}
                style={{
                  borderRadius: 6,
                  width: '100%',
                  height: hp(5),
                  alignItems: 'center',
                  color: 'white',
                  marginBottom: 20,
                  marginTop: 30,
                }}>
                {getStatusText(order?.commandStatus)}
              </Badge>
            </View>

            <ScrollView style={styles.containere}>
              <Text style={styles.modalTitle}>Signaler un problème</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Problem</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter the problem"
                  value={problem}
                  onChangeText={setProblem}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Enter your message"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Attachment</Text>
                <TouchableOpacity
                  style={styles.attachmentButton}
                  onPress={handleAttachment}>
                  <Icon name="paperclip" size={20} color={colors.primary} />
                  <Text style={styles.attachmentText}>
                    {attachment ? attachment.name : 'Attach File'}
                  </Text>
                </TouchableOpacity>
                {attachment && (
                  <Text style={styles.fileSize}>
                    {(attachment.size / 1024).toFixed(2)} KB
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>
                  Soumettre le rapport
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Alert Modal */}
      <Modal
        transparent={true}
        visible={alertModalVisible}
        animationType="fade"
        onRequestClose={() => setAlertModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.alertContent}>
            <Text style={styles.alertTexte}>
              Merci pour votre coopération.{' '}
            </Text>
            <Text style={styles.alertText}>
              Nous avons reçu votre rapport. Notre équipe examinera le problème
              et vous contactera dès que possible.
            </Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setAlertModalVisible(false)}>
              <Text style={styles.alertButtonText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  containerr: {
    width: '100%',
  },
  containere: {
    width: '100%',
  },
  problemButton: {
    padding: hp(2),
    width: '90%',
    left: 20,
    backgroundColor: colors.general_1,
    borderRadius: 5,
    borderColor: colors.primary,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    marginTop: hp(3),
    elevation: Platform.OS === 'android' ? 4 : 0,
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.5,
        shadowRadius: 2,
      },
    }),
  },
  problemButtonText: {
    color: colors.primary,
    textAlign: 'center',
    fontSize: hp(1.7),
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    // paddingTop: 50,
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 20,
  },
  textInput: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 5,
    marginBottom: 20,
  },
  submitButton: {
    padding: 15,
    marginTop: 20,
    backgroundColor: colors.secondary,
    borderRadius: 5,
    borderColor: colors.primary,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderTopWidth: 2,
    borderLeftWidth: 2,
  },
  submitButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: hp(1.7),
    fontWeight: '600',
  },
  alertContent: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  alertText: {
    padding: 20,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  alertTexte: {
    fontWeight: '700',
    paddingTop: 20,
    fontSize: 18,
    textAlign: 'center',
    color: colors.primary,
  },
  alertTextee: {
    fontWeight: '700',
    marginTop: 10,
    fontSize: 14,
    color: colors.primary,
    justifyContent: 'flex-start',
    alignSelf: 'flex-start',
  },
  alertButton: {
    padding: 15,
    backgroundColor: colors.secondary,
    borderRadius: 5,
    width: '100%',
    margin: 0,
  },
  alertButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 6,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: colors.secondary,
    padding: 10,
    fontSize: 14,
    width: '100%',
    color: 'black',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    color: 'black',
  },
  attachmentButton: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentText: {
    color: '#666666',
    fontSize: 14,
    textAlign: 'left',
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
  fileSize: {
    fontSize: 12,
    color: 'gray',
    marginTop: 5,
  },
});

export default SignalerProblem;
