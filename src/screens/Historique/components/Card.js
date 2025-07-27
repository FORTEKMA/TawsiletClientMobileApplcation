import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { colors } from "../../../utils/colors";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

export const Card = ({ order ,refresh}) => {
  const { t } = useTranslation();
  const scaleValue = new Animated.Value(1);
  const navigation = useNavigation();
  
 

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return colors.warning;
      case "dispatched_to_partner":
        return colors.uberBlue; 
      case "assigned_to_driver":
        return colors.purple; 
      case "driver_on_route_to_pickup":
        return colors.info; 
      case "arrived_at_pickup":
        return colors.orange; 
      case "picked_up":
        return colors.orange; 
      case "on_route_to_delivery":
        return colors.info; 
      case "arrived_at_delivery":
        return colors.success; 
      case "delivered":
        return colors.success; 
      case "completed":
        return colors.success; 
      case "canceled_by_client":
      case "canceled_by_partner":
        return colors.error; 
      case "failed_pickup":
      case "failed_delivery":
        return colors.error; 
      case "go_to_pickup":
        return colors.orange; 
      default:
        return colors.gray;
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "time-outline";
      case "dispatched_to_partner":
        return "send-outline";
      case "assigned_to_driver":
        return "person-outline";
      case "driver_on_route_to_pickup":
        return "car-outline";
      case "arrived_at_pickup":
        return "location-outline";
      case "picked_up":
        return "cube-outline";
      case "on_route_to_delivery":
        return "car-outline";
      case "arrived_at_delivery":
        return "location-outline";
      case "delivered":
        return "checkmark-done-circle-outline";
      case "completed":
        return "checkmark-circle-outline";
      case "canceled_by_client":
        return "close-circle-outline";
      case "canceled_by_partner":
        return "close-circle-outline";
      case "failed_pickup":
        return "alert-circle-outline";
      case "failed_delivery":
        return "alert-circle-outline";
      case "go_to_pickup":
        return "navigate-outline";
      default:
        return "help-circle-outline";
    }
  };

  const getStatusTranslation = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return t("history.status.pending");
      case "dispatched_to_partner":
        return t("history.status.dispatched_to_partner");
      case "assigned_to_driver":
        return t("history.status.assigned_to_driver");
      case "driver_on_route_to_pickup":
        return t("history.status.driver_on_route_to_pickup");
      case "arrived_at_pickup":
        return t("history.status.arrived_at_pickup");
      case "picked_up":
        return t("history.status.picked_up");
      case "on_route_to_delivery":
        return t("history.status.on_route_to_delivery");
      case "arrived_at_delivery":
        return t("history.status.arrived_at_delivery");
      case "delivered":
        return t("history.status.delivered");
      case "completed":
        return t("history.status.completed");
      case "canceled_by_client":
        return t("history.status.canceled_by_client");
      case "canceled_by_partner":
        return t("history.status.canceled_by_partner");
      case "failed_pickup":
        return t("history.status.failed_pickup");
      case "failed_delivery":
        return t("history.status.failed_delivery");
      case "go_to_pickup":
        return t("history.status.go_to_pickup");
      default:
        return t("history.status.unknown");
    }
  };

  
   return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("OrderDetails", { id: order.documentId,refresh })}
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.orderInfo}>
            <Ionicons name="receipt-outline" size={hp(2.5)} color={colors.textPrimary} />
            <Text style={styles.title}>#{order.refNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.commandStatus) }]}>
            <Ionicons 
              name={getStatusIcon(order.commandStatus)} 
              size={hp(1.8)} 
              color={colors.textInverse} 
              style={styles.statusIcon}
            />
            <Text style={styles.statusText}>{getStatusTranslation(order.commandStatus)}</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={hp(2)} color={colors.textSecondary} />
            <Text style={styles.label} numberOfLines={1}>
              {order?.driver?.firstName} {order?.driver?.lastName}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={hp(2)} color={colors.textSecondary} />
            <Text style={styles.label} numberOfLines={1}>
              {order?.dropOfAddress?.Address?.replace(/"/g, "")}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={hp(2)} color={colors.textSecondary} />
            <Text style={styles.label} numberOfLines={1}>
              {t(order.payType)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar-outline" size={hp(1.8)} color={colors.textSecondary} />
            <Text style={styles.date}>{new Date(order.createdAt).toLocaleString()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundPrimary,
    borderRadius: 16,
    padding: hp(2.5),
    marginVertical: hp(1),
    marginHorizontal: wp(4),
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.uberBlack,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: hp(2),
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
    
  },
  title: {
    fontSize: hp(2.2),
    fontWeight: "700",
    color: colors.textPrimary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderRadius: 20,
    gap: wp(1),
    minWidth: wp(25),
    justifyContent: "center",
  },
  statusIcon: {
    marginRight: wp(1),
  },
  statusText: {
    fontSize: hp(1.6),
    color: colors.textInverse,
    textTransform: "capitalize",
    fontWeight: "600",
  },
  body: {
    gap: hp(1.5),
    backgroundColor: colors.backgroundSecondary,
    padding: hp(2),
    borderRadius: 12,
    marginBottom: hp(2),
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(3),
  },
  label: {
    fontSize: hp(1.8),
    color: colors.textPrimary,
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: hp(1.5),
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(2),
  },
  date: {
    fontSize: hp(1.6),
    color: colors.textSecondary,
    fontWeight: "500",
  },
});

