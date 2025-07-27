import { StyleSheet } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { colors } from '../../utils/colors';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: hp(2.8),
    fontWeight: 'bold',
    color: colors.primary,
  },
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
    paddingTop: hp(2),
  },
  date: {
    fontWeight: 'bold',
    marginTop: hp(2),
    marginBottom: hp(1),
    color: colors.text,
    fontSize: hp(2),
    alignSelf: 'flex-start',
  },
  notificationContainer: {
    width: '100%',
    minHeight: hp(10),
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(4),
    marginBottom: hp(1.5),
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  notificationImage: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    marginRight: wp(3),
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'column',
    gap: hp(0.5),
  },
  notificationTitle: {
    color: colors.text,
    fontSize: hp(1.9),
    fontWeight: '600',
  },
  notificationDescription: {
    color: colors.textSecondary,
    fontSize: hp(1.7),
    fontWeight: '400',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
    backgroundColor: colors.background,
  },
  emptyIcon: {
    marginBottom: hp(3),
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: hp(1),
  },
  emptyDescription: {
    fontSize: hp(1.9),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: hp(2.5),
  },
});


