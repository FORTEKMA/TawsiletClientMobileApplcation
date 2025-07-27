import { I18nManager, StyleSheet } from 'react-native';
import { colors } from "../../utils/colors";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  drawerToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  mainContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formContainer: {
    flex: 1,
    paddingTop: 20,
    gap: 20,
  },
  inputContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c0c0c',
    marginBottom: 8,
  },
  input: {
    height: 64,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 5,
    backgroundColor: '#F7F8F9',
    color: '#000',
  },
  passwordContainer: {
    height: 64,
    borderWidth: 1,
    borderColor: '#E8ECF4',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    backgroundColor: '#F7F8F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordContainerError: {
    borderColor: '#FF3B30',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    color: '#000',
    textAlign:I18nManager.isRTL? "right":"left"
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: -5,
    marginBottom: 10,
    marginLeft: 5,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8ECF4',
    height: 120,
    justifyContent: 'center',
  },
  nextButton: {
    backgroundColor: '#0c0c0c',
    height: 64,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#0c0c0c80',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#ccc',
  },
  menuButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',

  },
  arrowIcon: {
    width: 20,
    height: 20,
    tintColor: '#0c0c0c',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c0c0c',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    
  },
  logoutIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  header: {
    backgroundColor: colors.general_1,
    marginTop: -50,
    height: hp(38),
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 30,
  },
  settingsButton: {
    position: "absolute",
    top: 20,
    right: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginTop: 20,
    objectFit: "cover",
    position: "relative",
  },
  userName: {
    color: "#000",
    fontSize: hp(2.5),
    fontWeight: "700",
    marginTop: 10,
  },
  userPhone: {
    color: "#000",
    fontSize: hp(2.1),
    fontWeight: "500",
    marginTop: 5,
  },
  userEmail: {
    color: colors.general_3,
    fontSize: hp(2.1),
    fontWeight: "500",
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    padding: 20,
    borderWidth: 3,
    borderColor: '#ccc',
    marginHorizontal: 20,
  
  },
  statItem: {
  //  alignItems: "center",
  //  padding: 10,
  //  borderRadius: 15,
   // minWidth: 90,
  },
  statIcon: {
    width: 45,
    height: 45,
    marginBottom: 8,
  },
  statValue: {
    color: "#0c0c0c",
    fontSize: hp(2.2),
    fontWeight: "700",
    marginTop: 5,
    textAlign: 'center',
  },
  statLabel: {
    color: "#000",
    fontSize: hp(1.6),
    fontWeight: "500",
    marginTop: 4,
    textAlign: 'center',
  },
  // Tab Navigation Styles
  tabBar: {
    backgroundColor: "#19191C",
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  tabLabel: {
    textTransform: 'none',
    fontSize: hp(1.8),
    fontWeight: '600',
  },
  tabIndicator: {
    backgroundColor: '#0c0c0c',
    height: 3,
  },
  // Section Styles
  sectionContainer: {
    flex: 1,
   // padding: 20,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    color: '#0c0c0c',
    fontSize: hp(2.2),
    fontWeight: '600',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    color: '#000',
    fontSize: hp(1.8),
    marginBottom: 8,
  },
  input: {
   // backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 10,
    padding: 15,
    color: '#000',
    fontSize: hp(1.8),
    flex:1
  },
  inputError: {
    borderColor: '#D21313',
  },
  saveButton: {
    backgroundColor: '#0c0c0c',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#0c0c0c80',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: hp(1.8),
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0c0c0c20",
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: "#01050D",
    fontWeight: "700",
    fontSize: hp(2.4),
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: hp(1.8),
    color: "#666666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#0c0c0c',
  },
  modalButtonSecondary: {
    backgroundColor: '#F5F5F5',
  },
  modalButtonText: {
    fontSize: hp(1.8),
    fontWeight: "600",
    color: "#01050D",
  },
  modalButtonTextSecondary: {
    color: "#666666",
  },
  // Error Styles
  errorText: {
    color: "#D21313",
    fontSize: hp(1.5),
    marginTop: 5,
  },
  // Help Section Styles
  helpOptionsContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  helpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0c0c0c',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  helpOptionText: {
    color: '#fff',
    fontSize: hp(1.8),
    marginLeft: 15,
    fontWeight: '600',
  },
  faqContainer: {
   // marginTop: 20,
  },
  faqTitle: {
    color: '#0c0c0c',
    fontSize: hp(2),
    fontWeight: '600',
    marginBottom: 15,
  },
  faqItem: {
    borderWidth:1,
   borderColor:'#E0E0E0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  faqQuestion: {
    color: '#000',
    fontSize: hp(1.8),
    fontWeight: '600',
    marginBottom: 8,
  },
  faqAnswer: {
    color: '#444',
    fontSize: hp(1.6),
    lineHeight: 22,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    flex:1
  },
  eyeIcon: {
    
    marginStart: 15,
     
    
    height:"100%",
    width:60,
    alignItems:"center",
    justifyContent:"center"
  },
  languageButtons: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
  },
  languageButton: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
     borderWidth:1,
    borderColor:'#E0E0E0',
    flexDirection:'row',
  },
});
