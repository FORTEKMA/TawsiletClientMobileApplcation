import { StyleSheet } from 'react-native';
import { colors } from "../../utils/colors";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    width: wp("85%"),
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 16,
    padding: hp(3),
    alignItems: "center",
    shadowColor: colors.uberBlack,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  textStyle: {
    color: colors.textInverse,
    fontWeight: "700",
    textAlign: "center",
    fontSize: hp(1.8),
  },
  modalText: {
    marginBottom: hp(2),
    textAlign: "center",
    fontSize: hp(2),
    color: colors.textPrimary,
  },
  modalHead: {
    flex: 0.7,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: wp(4),
  },
  modalBottom: {
    width: "100%",
    backgroundColor: colors.uberBlack,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: hp(2),
    marginTop: hp(2),
  },
  paymentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: wp(4),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    marginHorizontal: wp(4),
    marginTop: hp(2),
    shadowColor: colors.uberBlack,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: wp(4),
  },
  paymentIcon: {
    width: wp(6),
    height: wp(6),
    resizeMode: 'contain',
  },
  paymentText: {
    color: colors.textPrimary,
    fontSize: hp(1.8),
  },
  paymentType: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: hp(2),
  },
  paymentAmount: {
    color: colors.uberBlue,
    fontWeight: "700",
    fontSize: hp(2),
  },
  itemsContainer: {
    padding: wp(4),
  },
  driverInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    alignSelf: 'center',
    gap: wp(3),
    marginBottom: hp(2),
    marginTop: hp(2),
    padding: wp(3),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  driverInfoParent: {
    display: "flex",
    flexDirection: "row",
    gap: wp(3),
    alignItems: "center",
  },
  profilePicture: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  mape: {
    width: wp(35),
    height: hp(15),
    marginTop: hp(1),
    borderRadius: 8,
  },
  driverDetails: {
    flexDirection: "column",
    justifyContent: "center",
  },
  driverName: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: hp(1.9),
  },
  driverPhone: {
    color: colors.textSecondary,
    fontSize: hp(1.7),
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: hp(0.5),
  },
  star: {
    marginHorizontal: wp(0.5),
  },
  phoneImage: {
    width: wp(8),
    height: wp(8),
    resizeMode: 'contain',
  },
  callout: {
    backgroundColor: colors.backgroundPrimary,
    padding: wp(2),
    borderRadius: 8,
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  calloutContainer: {
    padding: wp(1),
  },
  calloutText: {
    fontSize: hp(1.5),
    color: colors.textPrimary,
  },
});


