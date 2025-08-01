import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Image,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import React, {useRef, useState} from 'react';
import {colors} from '../utils/colors';
 import CountryPicker from 'react-native-country-picker-modal';
 import Ionicons from 'react-native-vector-icons/Ionicons';
import PhoneInput from 'react-native-phone-input';
import Divider from './Divider';
import {useDispatch} from 'react-redux';
import {
  forgetPassword,
  getCurrentUser,
  userLogin,
} from '../store/userSlice/userSlice';
import {useNavigation} from '@react-navigation/native';
const LogInStepper = ({}) => {
  const navigation = useNavigation();
  const phoneInput = useRef(null);
  const dispatch = useDispatch();
  const [isFlagsVisible, setIsFlagsVisible] = useState(false);
  const [show, setShow] = useState(false);
  const [forgotPsw, setForgotPsw] = useState(false);
  const [Errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [number, setNumber] = useState('');
  const [email, setEmail] = useState(null);
  const [loginWithEmail, setLoginWithEmail] = useState(false);
  const [login, setLogin] = useState({
    identifier: '',
    password: '',
  });

  const validEmail = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email est requis';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Veuillez saisir une adresse e-mail valide.';
    }

    if (Object.keys(newErrors).length === 0) {
      setErrors({});
      return true;
    } else {
      setErrors(newErrors);
      return false;
    }
  };
  const {width} = useWindowDimensions();
  const setCountry = country => {
    if (phoneInput) {
      phoneInput.current.selectCountry(country.cca2.toLowerCase());
    }
    setIsFlagsVisible(false);
  };
  const isPhoneNumberValid = () => {
    if (!number) {
      alert('Veuillez saisir un numéro de téléphone.');
      return false;
    }

    // Remove any non-numeric characters from the number
    const numericNumber = number.replace(/\D/g, '');

    // Define your minimum length (e.g., 5)
    const minimumLength = 7;

    // Check if the numericNumber has at least the minimum length
    if (numericNumber.length < minimumLength) {
      alert('Numero de téléphone est invalide.');
      return false;
    }

    // You can also check for any additional criteria here, such as allowed characters

    return true;
  };
  const renderFlag = ({imageSource}) => {
    return (
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <Image
          source={imageSource}
          resizeMode="contain"
          style={{width: 30, height: 25}}
        />
        <Ionicons name={'chevron-down-outline'} size={24} color={'gray'} />
      </View>
    );
  };
  return (
    <SafeAreaView style={styles.container}>
      {forgotPsw && (
        <View style={styles.formContainer}>
          <Text style={styles.headerTitle}>
            Entrez votre email de récuperation
          </Text>

          <Text style={{color: colors.primary}}>Email</Text>
          <TextInput
            style={[styles.textInput, {borderColor: 'red'}]}
            placeholder="email@example.com"
            onChangeText={text => setEmail(text)}
            placeholderTextColor="gray"
          />
          {Errors.email && <Text style={{color: 'red'}}>{Errors.email}</Text>}
          <TouchableOpacity
            style={styles.btn}
            onPress={() => {
              if (validEmail()) {
                dispatch(forgetPassword(email)).then(() => {
                  setSent(true);
                  setTimeout(() => {
                    setSent(false);
                    setForgotPsw(false);
                  }, 2000);
                });
              }
            }}>
            <Text style={styles.btnText}>Envoyer</Text>
          </TouchableOpacity>
          {sent && (
            <Text style={{color: colors.primary, alignSelf: 'center'}}>
              Email de récuperation a été envouyer
            </Text>
          )}
        </View>
      )}

      {/*   <View style={styles.dividerContainer}>
            <View style={styles.divider}></View>
            <Text style={styles.dividerText}>Ou connectez-vous avec</Text>
            <View style={styles.divider}></View>
          </View>
          <View style={styles.socialLoginContainer}>
            <Image
              source={require('../assets/Google.png')}
              style={styles.socialIcon}
            />
            <Image
              source={require('../assets/Vector.png')}
              style={styles.socialIcon}
            />
            <Image
              source={require('../assets/Apple.png')}
              style={styles.socialIcon}
            />
          </View> */}
      {loginWithEmail && !forgotPsw && (
        <View style={styles.formContainer}>
          <Text
            style={{
              fontWeight: '600',
              fontSize: 20,
              color: 'black',
            }}>
            Entrez votre Email et mot de passe
          </Text>

          <Text style={{color: colors.primary}}>Email</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Email@exemple.com"
              onChangeText={text => setLogin({...login, identifier: text})}
              placeholderTextColor="gray"
            />
          </View>
          <Text style={{color: colors.primary}}>Mot de passe</Text>
          <View style={styles.inputContainer}>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.textInput}
                onChangeText={text => setLogin({...login, password: text})}
                secureTextEntry={!show}
                placeholder="Password"
                placeholderTextColor="gray"
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShow(!show)}>
                <Ionicons
                  name={show ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={'gray'}
                />
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => {
              dispatch(userLogin(login)).then(() => dispatch(getCurrentUser()));
            }}>
            <Text style={styles.btnText}>Se connecté </Text>
          </TouchableOpacity>
        </View>
      )}
      {!loginWithEmail && !forgotPsw && (
        <>
          <View style={styles.formContainer}>
            <Text style={styles.headerTitle}>Entrez votre numéro</Text>

            <Text style={{color: colors.primary}}>Numéro de téléphone</Text>
            <View style={styles.inputContainer}>
              <View style={{flex: 3}}>
                <PhoneInput
                  renderFlag={renderFlag}
                  autoFormat
                  initialCountry="tn"
                  onPressFlag={() => setIsFlagsVisible(true)}
                  onChangePhoneNumber={phone => setNumber(phone)}
                  style={{
                    borderBottomWidth: 1,
                    borderColor: '#B2B5C433',
                    height: 50,
                  }}
                  textComponent={TextInput} // Use TextInput as the text component
                  textProps={{
                    style: {
                      color: 'black', // Set the text color to black
                    },
                  }}
                  ref={phoneInput}
                />
              </View>
            </View>
            <CountryPicker
              withFilter
              withFlag
              withAlphaFilter
              withCallingCode
              placeholder=""
              onSelect={item => setCountry(item)}
              visible={isFlagsVisible}
              translation="fra"
              filterProps={{placeholder: 'Rechercher...'}}
            />
            <View>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => {
                  if (isPhoneNumberValid()) {
                    navigation.navigate('confirmation', {number});
                  }
                }}>
                <Text style={styles.btnText}>Continuer</Text>
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: 'row',
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <View style={{width: '50%'}}>
                <Divider />
              </View>
              <Text
                style={{
                  color: 'black',
                  fontWeight: '600',
                  marginHorizontal: 15,
                }}>
                Ou
              </Text>
              <View style={{width: '50%'}}>
                <Divider />
              </View>
            </View>
            <View>
              <TouchableOpacity
                style={styles.btn}
                onPress={() => {
                  setLoginWithEmail(true);
                }}>
                <Text style={styles.btnText}>Se connecté par E-mail</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setForgotPsw(true)}>
                <Text
                  style={{
                    color: colors.primary,
                    marginTop: 10,
                    alignSelf: 'center',
                  }}>
                  Mot de passe oublié ?
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 90,
    paddingBottom: 25,

    width: '100%',
    backgroundColor: 'red',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 20,
    color: 'black',
  },
  formContainer: {
    width: '100%',
    padding: 10,

    gap: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 10,
    width: '100%',
  },
  countryFlagContainer: {
    flex: 1,
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
    borderColor: colors.primary,
    justifyContent: 'center',
  },
  countryFlag: {
    color: 'black',
    fontSize: 20,
  },
  input: {
    width: '100%',
  },
  btn: {
    padding: 15,
    backgroundColor: colors.secondary,
    borderRadius: 20,

    borderWidth: 2,
    borderColor: colors.primary,
    // Add borders using negative margin trick
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  btnText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    marginVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: colors.primary,
    flex: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    color: 'black',
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
  },
  socialIcon: {
    width: 50,
    height: 50,
  },
  textInput: {
    width: '100%',
    height: 50,
    borderBottomWidth: 1,
    borderColor: '#B2B5C433',
    paddingHorizontal: 10,
    color: 'black',
    fontSize: 16,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderBottomWidth: 1,
    borderColor: '#B2B5C433',
  },
  eyeIcon: {
    paddingRight: 10,
    paddingLeft: 10,
  },
});

export default LogInStepper;
