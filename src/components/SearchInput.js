import React, { useState } from "react";
import { TextInput, View, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";

const SearchInput = ({ onFocus, onBlur, setFilter }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isInputFocused, setIsInputFocused] = useState(false);

  const handleInputFocus = () => {
    setIsInputFocused(true);
    onFocus && onFocus();
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    onBlur && onBlur();
  };

  const handleSubmitEditing = () => {
    setIsInputFocused(false);
    onBlur && onBlur();
    setFilter && setFilter(searchTerm);
  };

  return (
    <View style={styles.container}>
      {!isInputFocused && (
        <Ionicons name={"search-outline"} size={24} color="black" />
      )}
      <TextInput
        style={styles.input}
        placeholder="Rechercher..."
        placeholderTextColor="#666"
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onSubmitEditing={handleSubmitEditing}
        onChangeText={(text) => setSearchTerm(text)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 16,
  },
});

export default SearchInput;
