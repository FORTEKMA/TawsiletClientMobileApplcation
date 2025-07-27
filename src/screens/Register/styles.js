import {StyleSheet} from 'react-native';
import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen';
import {colors} from '../../utils/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundPrimary,
  },
  inputContainer: {
    width: wp('90%'),
    gap: hp(2.5),
  },
  input: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    fontSize: hp(1.8),
    color: colors.textPrimary,
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  btn: {
    paddingVertical: hp(2),
    backgroundColor: colors.uberBlack,
    borderRadius: 12,
    marginTop: hp(3),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: colors.textInverse,
    textAlign: 'center',
    fontSize: hp(2),
    fontWeight: '700',
  },
  stepContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
    gap: hp(3),
  },
  title: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: hp(3.2),
  },
  inputLabel: {
    fontWeight: '600',
    color: colors.textPrimary,
    fontSize: hp(1.8),
    marginBottom: hp(1),
  },
  errorText: {
    color: colors.error,
    fontSize: hp(1.5),
    marginTop: hp(0.5),
    marginLeft: wp(1),
  },
  buttonContainer: {
    alignSelf: 'center',
    width: wp('90%'),
  },
});

