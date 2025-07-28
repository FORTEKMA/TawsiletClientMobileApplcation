import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  FlatList,
  Text,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  StyleSheet
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useIsFocused } from "@react-navigation/native";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from "react-native-responsive-screen";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { getUserOrdersById } from "../../store/commandeSlice/commandeSlice";
import { StatusFilter } from "./components/StatusFilter";
import { SearchInput } from "./components/SearchInput";
import { Card } from "./components/Card";
import { Empty } from "./components/Empty";
import { colors } from "../../utils/colors";
import { useTranslation } from "react-i18next";
import { 
  trackScreenView, 
  trackHistoryViewed
} from '../../utils/analytics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const Historique = ({ navigation }) => {
  const dispatch = useDispatch();
  const [statusFilter, setStatusFilter] = useState(null);
  const [filter, setFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
    
  const pagination = useSelector((state) => state?.commandes?.meta?.pagination);
  
  const userID = useSelector((state) => state?.user?.currentUser?.documentId);
  const [newOrders, setNewOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  
  // Track screen view on mount
  useEffect(() => {
    trackScreenView('History');
    trackHistoryViewed();
    
    // Animate screen entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);
  
  useEffect(() => {
    getData(true);
  }, [statusFilter, filter]);

  useCallback(() => {
    if (isFocused) {
      getData(true);
    }
  }, [isFocused]);

  const manageStatus = (status) => {
    if (status === null) return [];
    if (status === "active") return ["Pending", "Dispatched_to_partner", "Assigned_to_driver", "Driver_on_route_to_pickup", "Arrived_at_pickup", "Picked_up", "On_route_to_delivery", 'Arrived_at_delivery', "Go_to_pickup"];
    if (status === "completed") return ["Delivered", "Completed"];
    if (status === "cancelled") return ['Canceled_by_client', "Canceled_by_partner"];
  };

  const getData = (reset = false) => {
    if (reset) setNewOrders([]);
    if (loading) return;

    setLoading(true);
    dispatch(
      getUserOrdersById({
        id: userID,
        currentPage: reset ? 1 : pagination?.page + 1,
        pageSize: pagination?.pageSize,
        filter: filter,
        status: manageStatus(statusFilter),
      })
    )
      .then((res) => {
        setLoading(false);
        if (reset === true) {
          setNewOrders(res.payload.data);
        } else {
          setNewOrders((prevOrders) => [...prevOrders, ...res.payload.data]);
        }
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
      });
  };

  const handleFilterChange = (newFilter) => {
    setStatusFilter(newFilter);
 
  };

  const handleSearch = (searchTerm) => {
    setFilter(searchTerm);
  };

  const handleEndReached = () => {
    if (pagination?.pageCount && pagination?.pageCount > pagination?.page && !loading) {
      getData();
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    getData(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getFilterStats = () => {
    const total = newOrders.length;
    const active = newOrders.filter(order => 
      ["Pending", "Dispatched_to_partner", "Assigned_to_driver", "Driver_on_route_to_pickup", "Arrived_at_pickup", "Picked_up", "On_route_to_delivery", 'Arrived_at_delivery', "Go_to_pickup"].includes(order.commandStatus)
    ).length;
    const completed = newOrders.filter(order => 
      ["Delivered", "Completed"].includes(order.commandStatus)
    ).length;
    const cancelled = newOrders.filter(order => 
      ['Canceled_by_client', "Canceled_by_partner"].includes(order.commandStatus)
    ).length;

    return { total, active, completed, cancelled };
  };

  const stats = getFilterStats();

  // Loading placeholder component
  const LoadingPlaceholder = () => (
    <View style={styles.loadingPlaceholder}>
      <View style={styles.loadingCard}>
        <View style={styles.loadingHeader}>
          <View style={styles.loadingAvatar} />
          <View style={styles.loadingTextContainer}>
            <View style={styles.loadingTitle} />
            <View style={styles.loadingSubtitle} />
          </View>
        </View>
        <View style={styles.loadingContent}>
          <View style={styles.loadingLine} />
          <View style={[styles.loadingLine, { width: '70%' }]} />
          <View style={[styles.loadingLine, { width: '60%' }]} />
        </View>
      </View>
    </View>
  );

  const renderHeader = () => {
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.total}</Text>
              <Text style={styles.statLabel}>{t('history.total_rides')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{stats.active}</Text>
              <Text style={styles.statLabel}>{t('history.active')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#34C759' }]}>{stats.completed}</Text>
              <Text style={styles.statLabel}>{t('history.completed')}</Text>
            </View>
          </View>
        </View>

        {/* Filters */}
        <StatusFilter
          setStatusFilter={handleFilterChange}
          statusFilter={statusFilter}
        />
        
        {/* Search */}
        <View style={styles.inputContainer}>
          <SearchInput setFilter={handleSearch} />
        </View>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{
          translateY: fadeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [50, 0],
          }),
        }],
      }}
    >
      <Card 
        refresh={() => getData(true)} 
        key={item.id} 
        order={item} 
        index={index}
      />
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View style={[styles.emptyContainer, { opacity: fadeAnim }]}>
      <MaterialCommunityIcons name="history" size={80} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>{t('history.no_rides_title')}</Text>
      <Text style={styles.emptySubtitle}>{t('history.no_rides_subtitle')}</Text>
      <TouchableOpacity 
        style={styles.bookRideButton}
        onPress={() => navigation.navigate('Home')}
      >
        <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        <Text style={styles.bookRideButtonText}>{t('history.book_ride')}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity 
          style={styles.drawerToggleButton}
          onPress={() => navigation.openDrawer()}
        >
          <MaterialCommunityIcons name="menu" size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t("common.Historique")}</Text>
          <Text style={styles.headerSubtitle}>
            {newOrders.length} {t('history.rides_found')}
          </Text>
        </View>
        
        <View 
          style={styles.refreshButton}
          
        >
           
        </View>
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        <FlatList
          style={styles.flatList}
          data={newOrders}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderItem}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={renderHeader}
          onEndReached={handleEndReached}
          scrollEventThrottle={16}
          ListEmptyComponent={!loading ? renderEmptyState : null}
          ListFooterComponent={
            loading && newOrders.length > 0 ? (
              <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>{t('common.loading_more')}</Text>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={newOrders.length === 0 ? styles.emptyListContainer : null}
        />
      </View>

   
      {/* Loading Placeholders */}
      {loading && newOrders.length === 0 && (
        <View style={styles.placeholdersContainer}>
          {[1, 2, 3].map((index) => (
            <LoadingPlaceholder key={index} />
          ))}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
   
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 16,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  flatList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  bookRideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bookRideButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  // Loading placeholder styles
  placeholdersContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingPlaceholder: {
    marginBottom: 16,
  },
  loadingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  loadingTextContainer: {
    flex: 1,
  },
  loadingTitle: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 6,
    width: '60%',
  },
  loadingSubtitle: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: '40%',
  },
  loadingContent: {
    gap: 8,
  },
  loadingLine: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: '100%',
  },
});

export default Historique;

