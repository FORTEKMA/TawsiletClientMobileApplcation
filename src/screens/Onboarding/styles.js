import {StyleSheet} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { colors } from '../../utils/colors';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: hp(6),
    paddingBottom: hp(4),
  },
  stepIndicatorWrapper: {
    paddingHorizontal: wp(5),  
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: hp(2),
  },
  stepIndicator: {
    fontSize: hp(2.4),
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(5),  
  },
  title: {
    fontSize: hp(3.2),
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    width: '100%',
    marginBottom: hp(1.5),
  },
  subtitle: {
    fontSize: hp(2.2),
    color: colors.textSecondary,
    textAlign: 'center',
    width: '100%',
    marginBottom: hp(4),
  },
  illustration: {
    width: wp(90),
    height: hp(45),
    alignSelf: 'center',
    marginTop: hp(2),
    resizeMode: 'contain',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: hp(3),
    paddingHorizontal: wp(5),  
  },
  skipButton: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: hp(2),
    marginRight: wp(2),
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  nextButton: {
    flex: 1,
    backgroundColor: colors.uberBlack,
    borderRadius: 12,
    paddingVertical: hp(2),
    marginLeft: wp(2),
    alignItems: 'center',
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  skipText: {
    color: colors.textPrimary,
    fontSize: hp(2),
    fontWeight: '600',
  },
  nextText: {
    color: colors.textInverse,
    fontSize: hp(2),
    fontWeight: '700',
  },
  btnWrapper: {
    flex: 0.3,
    backgroundColor: colors.uberBlack,
    width: '90%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 15,
  },
  btn: {
    padding: 20,
    backgroundColor: colors.uberBlack,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.uberBlack,
  },
  text: {
    color: colors.textPrimary,
    textAlign: 'center',
    fontSize: hp(1.8),
  },
  registerText: {
    color: colors.textSecondary,
  },
  registerLink: {
    color: colors.uberBlue,
  },
  registerContainer: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
  },
  // Styles for pagination dots
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: hp(3),
    marginBottom: hp(2),
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: colors.uberBlack,
  },
  inactiveDot: {
    backgroundColor: colors.borderMedium,
  },
});

