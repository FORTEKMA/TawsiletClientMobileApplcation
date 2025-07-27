import {StyleSheet} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {colors} from '../../utils/colors';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundPrimary,
  },
  backButton: {
    width: wp(10),
    height: wp(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: wp(5),
    backgroundColor: colors.backgroundSecondary,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: wp(5),
    paddingTop: hp(3),
    gap: hp(3),
  },
  titleText: {
    color: colors.textPrimary,
    fontSize: hp(2.2),
    textAlign: 'center',
    marginBottom: hp(2),
    fontWeight: '600',
  },
  input: {
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: wp(4),
    marginTop: hp(1),
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  text: {
    color: colors.textPrimary,
    fontSize: hp(1.8),
  },
  nextButton: {
    backgroundColor: colors.uberBlack,
    padding: hp(1.8),
    borderRadius: 12,
    width: wp(50),
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: hp(3),
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  alreadyRatedText: {
    color: colors.uberBlue,
    fontWeight: '600',
    fontSize: hp(1.8),
    textAlign: 'center',
    marginTop: hp(2),
  },
});


