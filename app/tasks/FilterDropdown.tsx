// components/tasks/FilterDropdown.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  categories: string[];
  selected: string[];
  onChange: (newSelected: string[]) => void;
};

const FilterDropdown: React.FC<Props> = ({ categories, selected, onChange }) => {
  const [open, setOpen] = useState(false);

  function toggleCategory(cat: string) {
    if (selected.includes(cat)) {
      onChange(selected.filter((c) => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  }

  return (
    <View>
      {/* Button */}
      <TouchableOpacity style={styles.button} onPress={() => setOpen(true)}>
        <Ionicons name="filter-outline" size={18} color="#fff" />
        <Text style={styles.buttonText}>Filter</Text>
      </TouchableOpacity>

      {/* Modal */}
      <Modal visible={open} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Select Categories</Text>
            <ScrollView>
              {categories.map((cat) => {
                const active = selected.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={styles.option}
                    onPress={() => toggleCategory(cat)}
                  >
                    <Ionicons
                      name={active ? "checkbox-outline" : "square-outline"}
                      size={20}
                      color={active ? "#2ecc71" : "#888"}
                    />
                    <Text style={styles.optionText}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default FilterDropdown;

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2c3e50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  buttonText: { color: "#fff", marginLeft: 6, fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    maxHeight: "70%",
  },
  title: { fontSize: 16, fontWeight: "600", marginBottom: 12 },
  option: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  optionText: { marginLeft: 8, fontSize: 14 },
  closeBtn: {
    marginTop: 16,
    alignSelf: "center",
    backgroundColor: "#2c3e50",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  closeText: { color: "#fff", fontSize: 14 },
});
