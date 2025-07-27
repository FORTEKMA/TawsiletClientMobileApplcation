import {StyleSheet, Dimensions} from 'react-native';
import {heightPercentageToDP as hp} from 'react-native-responsive-screen';
import {colors} from '../../utils/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    zIndex: 999999999,
    height: 50,
  },
  stepContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  
  // Enhanced step wrapper with Uber-like styling
  step1Wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: SCREEN_HEIGHT * 0.4,
    maxHeight: SCREEN_HEIGHT * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 1000,
  },
  
  // Map container with enhanced styling
  mapContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  
  // Enhanced animations for step transitions
  stepTransition: {
    transform: [
      {
        translateY: 0,
      },
      {
        scale: 1,
      }
    ],
    opacity: 1,
  },
  
  stepTransitionHidden: {
    transform: [
      {
        translateY: SCREEN_HEIGHT * 0.5,
      },
      {
        scale: 0.95,
      }
    ],
    opacity: 0,
  },
  
  // Floating elements styling
  floatingButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 999,
  },
  
  // Enhanced backdrop for step overlays
  stepBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 500,
  },
  header: {
    height: 50,
    backgroundColor: colors.secondary,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    paddingHorizontal: 20,
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
  },
  nextButton: {
    backgroundColor: colors.secondary,
    padding: 10,
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  containerBtn: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  option: {
    flexDirection: 'row',
    backgroundColor: colors.general_2,
    width: '45%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 5,
  },
  texte: {
    fontWeight: '700',
    color: colors.primary,
    fontSize: hp(2),
  },
  text: {
    fontWeight: '400',
    color: colors.secondary_1,
    fontSize: hp(1.8),
  },
  yellowButton: {
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: hp(2),
    fontWeight: '700',
    color: 'black',
  },
  countValue: {
    fontSize: hp(2),
    marginHorizontal: 10,
    color: colors.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
    color: 'white',
    marginTop: 10,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  currentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    height: 60,
    width: '100%',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
  },
  autocompleteContainer: {
    flex: 1,
  },
  textInput: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  logo: {
    marginLeft: 10,
  },
  dateInput: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  timeInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    width: 60,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 16,
  },
  timeSeparator: {
    marginHorizontal: 5,
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 30,
  },
  switchText: {
    color: 'white',
    fontSize: hp(1.5),
    fontWeight: '400',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'end',
    alignSelf: 'flex-end',
  },
  markerContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveCircle: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 50,
  },
  confirmButton: {
    width:"100%",
    flex: 1,
    backgroundColor: '#030303',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#030303',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  mapContainer: {
   ... StyleSheet.absoluteFillObject
  },
  contentContainer: {
    position: 'absolute',
    top: '0.5%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 5,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderBottomLeftRadius: 10,
  },
  headerContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    padding: 5,
  },
  contentContainer: {
    flex: 0.5,
    paddingTop: 10,
  },
 
  
  step1Wrapper: {
   // flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    margin: 16,
    paddingTop:10,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
     width: '92%',
   
  },
  stepperContainer: {
    alignItems: 'center',
    marginRight: 10,
    width: 30,
  },
  stepperCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#030303',
    borderWidth: 2,
    borderColor: '#030303',
    marginBottom: 2,
    marginTop: 45,
  },
  stepperLine: {
    width: 2,
    height: 72,
    backgroundColor: '#E0E0E0',
    marginVertical: 2,
  },
  stepperIconContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepContent: {
    flex: 1,
    paddingLeft: 4,
  },
  step1Label: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    marginBottom: 4,

  
  },
  pickOffContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  pickOffLabel: {
    color: '#BDBDBD',
    fontSize: 13,
    marginBottom: 2,
  },
  destinationLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
    marginTop: 2,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  
  },
  carIcon: {
    marginLeft: 8,
  },
  countdownOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
     position:"absolute",
    top:"20%"
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    position:"absolute",
    top:"30%"
  },
  countdownBlock: {
    alignItems: 'center',
    marginHorizontal: 10,
    
  },
  countdownNumber: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  countdownLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 5,
  },
  countdownColon: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
    marginHorizontal: 2,
    marginTop: -5,
  },
}); 