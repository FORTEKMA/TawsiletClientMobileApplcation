import { StyleSheet } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { colors } from '../../utils/colors';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  header: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    width:"100%",
    alignSelf:"center",
    backgroundColor: colors.backgroundPrimary,
  },
  headerTitle: {
    fontSize: hp(2.8),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  container: {
    flex: 1,
    padding: wp(4),
  },
  date: {
    fontWeight: '600',
    marginTop: hp(2),
    marginBottom: hp(1),
    color: colors.textSecondary,
    fontSize: hp(1.8),
    alignSelf: 'flex-start',
  },
  notificationContainer: {
    width: '100%',
    minHeight: hp(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp(4),
    marginBottom: hp(1.5),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.backgroundSecondary,
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationImage: {
    width: wp(8),
    height: wp(8),
    marginRight: wp(3),
    borderRadius: wp(4),
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'column',
    gap: hp(0.5),
  },
  notificationTitle: {
    color: colors.textPrimary,
    fontSize: hp(1.8),
    fontWeight: '600',
  },
  notificationDescription: {
    color: colors.textSecondary,
    fontSize: hp(1.6),
    fontWeight: '400',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(5),
  },
  emptyIcon: {
    marginBottom: hp(3),
    opacity: 0.7,
  },
  emptyTitle: {
    fontSize: hp(2.2),
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: hp(1),
  },
  emptyDescription: {
    fontSize: hp(1.8),
    color: colors.textSecondary,
    textAlign: 'center',
  },
});


