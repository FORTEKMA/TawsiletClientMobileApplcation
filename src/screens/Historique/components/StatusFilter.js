import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors } from "../../../utils/colors";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import { useTranslation } from "react-i18next";

export const StatusFilter = ({ setStatusFilter, statusFilter }) => {
  const { t } = useTranslation();
  
  const filters = [
    { label: t("history.status_filter.all"), value: null },
    { label: t("history.status_filter.active"), value: "active" },
    { label: t("history.status_filter.completed"), value: "completed" },
    { label: t("history.status_filter.cancelled"), value: "cancelled" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.filterButtonsContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            onPress={() => setStatusFilter(filter.value)}
            style={[
              styles.filterButton,
              statusFilter === filter.value ? styles.filterButtonActive : null,
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === filter.value ? styles.filterButtonTextActive : null,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: hp(2),
    width: wp("90%"),
  },
  filterButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: wp(2),
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: colors.uberBlack,
    borderColor: colors.uberBlack,
  },
  filterButtonText: {
    color: colors.textPrimary,
    fontSize: hp(1.6),
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: colors.textInverse,
    fontWeight: "600",
  },
});


