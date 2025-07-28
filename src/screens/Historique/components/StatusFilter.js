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
      <View style={styles.filtersContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            onPress={() => setStatusFilter(filter.value)}
            style={[
              styles.filterButton,
              statusFilter === filter.value && styles.activeFilterButton
            ]}
          >
            <Text style={[
              styles.filterText,
              statusFilter === filter.value && styles.activeFilterText
            ]}>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filtersContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.gray,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterButton: {
    backgroundColor: "#0c0c0c",
    borderColor: "#0c0c0c",
  },
  filterText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "400",
    textAlign: 'center',
  },
  activeFilterText: {
    color: "#fff",
    fontWeight: "600",
  },
}); 