import { StyleSheet, Platform } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { colors } from '../../utils/colors';

export const styles = StyleSheet.create({
  // Modern Uber-like styles
  uberContainer: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  uberMainContainer: {
    flex: 1,
  },
  uberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  uberHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uberHeaderContent: {
    flex: 1,
    marginLeft: 12,
  },
  uberHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  uberHeaderSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  uberHeaderSpacer: {
    width: 40,
  },
  uberScrollView: {
    flex: 1,
  },
  uberScrollContainer: {
    paddingBottom: 24,
  },
  uberActionBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  uberActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  uberActionButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Notification Group Styles
  uberNotificationGroup: {
    marginTop: 16,
  },
  uberDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  uberDateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginRight: 16,
  },
  uberDateDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  uberNotificationList: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Notification Item Styles
  uberNotificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    position: 'relative',
  },
  uberNotificationItemUnread: {
    backgroundColor: '#F8F9FF',
  },
  uberNotificationItemLast: {
    borderBottomWidth: 0,
  },
  uberNotificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  uberNotificationContent: {
    flex: 1,
  },
  uberNotificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  uberNotificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  uberNotificationTitleUnread: {
    fontWeight: '700',
  },
  uberNotificationTime: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  uberNotificationDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 8,
  },
  uberNotificationActions: {
    marginTop: 8,
  },
  uberNotificationActionButton: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  uberNotificationActionText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  uberUnreadIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },

  // Empty State Styles
  uberEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  uberEmptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  uberEmptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  uberEmptyDescription: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  uberEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  uberEmptyButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  uberBottomSpacing: {
    height: Platform.OS === 'ios' ? 34 : 24,
  },

  // Legacy styles (keeping for compatibility)
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#fff',
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
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  container: {
    flex: 1,
    padding: wp(4),
  },
  date: {
    fontWeight: '600',
    marginTop: hp(2),
    marginBottom: hp(1),
    color: colors.text,
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
    marginBottom: hp(1),
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "#ccc",
   
  },
  notificationImage: {
    width: wp(8),
    height: wp(8),
    marginRight: wp(3),
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'column',
    gap: hp(0.5),
  },
  notificationTitle: {
    color: colors.text,
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
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: hp(1),
  },
  emptyDescription: {
    fontSize: hp(1.8),
    color: colors.textSecondary,
    textAlign: 'center',
  },
}); 