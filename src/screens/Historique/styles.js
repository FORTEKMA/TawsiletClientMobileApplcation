import { StyleSheet, Platform } from "react-native";
import { colors } from "../../utils/colors";
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";

export const styles = StyleSheet.create({
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundPrimary,
    paddingVertical: hp(5),
  },
  emptyText: {
    fontSize: hp(2),
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: hp(2),
  },
  clickableText: {
    color: colors.uberBlue,
    fontSize: hp(1.8),
    fontWeight: "600",
  },
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: colors.backgroundPrimary,
    paddingTop: Platform.OS === "ios" ? 50 : 0,
  },
  inputContainer: {
    marginTop: hp(2),
    width: wp("90%"),
    backgroundColor: colors.backgroundPrimary,
    paddingHorizontal: wp(4),
    height: hp(6.5),
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContainer: {
    width: '100%',
    alignItems: 'flex-start',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.backgroundPrimary,
  },
  headerText: {
    fontSize: hp(2.8),
    fontWeight: "700",
    color: colors.textPrimary,
  },
});


