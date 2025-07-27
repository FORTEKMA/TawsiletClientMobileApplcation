import React, { useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { colors } from "../../../utils/colors";
import { useTranslation } from "react-i18next";
import Ionicons from 'react-native-vector-icons/Ionicons';

export const SearchInput = ({ setFilter }) => {
  const [searchText, setSearchText] = useState("");
  const { t } = useTranslation();

  const handleSearch = (text) => {
    setSearchText(text);
    setFilter(text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={t("common.search_orders")}
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#000",
    fontSize: 16,
    paddingVertical: 0,
  },
}); 