import React, { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { colors } from "../../../utils/colors";
import { useTranslation } from "react-i18next";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";

export const SearchInput = ({ setFilter }) => {
  const [searchText, setSearchText] = useState("");
  const { t } = useTranslation();

  const handleSearch = (text) => {
    setSearchText(text);
    setFilter(text);
  };

  return (
    <View style={styles.container}>
      <MaterialIcons name="search" size={hp(2.5)} color={colors.textSecondary} style={styles.icon} />
      <TextInput
        style={styles.textInput}
        placeholder={t("common.search_orders")}
        placeholderTextColor={colors.textSecondary}
        value={searchText}
        onChangeText={handleSearch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    marginRight: wp(2),
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: hp(1.8),
    paddingVertical: 0,
  },
});


