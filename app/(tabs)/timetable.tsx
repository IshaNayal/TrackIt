import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';  // ✅ Add React import


import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getSemesterStats,
  getWorkingDays,
  saveSemesterStats,
  saveWorkingDays,
} from '../../services/storage';

/* 🔔 WEB-SAFE NOTIFICATION HANDLER */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: Platform.OS !== 'web',
    shouldPlaySound: Platform.OS !== 'web',
    shouldSetBadge: false,
  }),
});

export default function AttendanceScreen() {
  const [semesterStats, setSemesterStats] = useState({ 
    totalWorkingDays: 0, 
    attendedDays: 0, 
    percentage: 0 
  });
  const [dailyStatus, setDailyStatus] = useState<'idle' | 'checking' | 'attended' | 'missed'>('idle');

  /* 🔄 LOAD STATS */
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    if (Platform.OS !== 'web') {
      await Notifications.requestPermissionsAsync();
    }
    await loadStats();
    scheduleDailyNotifications();
  };

  const loadStats = async () => {
    try {
      const stats = await getSemesterStats();
      setSemesterStats(stats || { totalWorkingDays: 0, attendedDays: 0, percentage: 0 });
    } catch {
      setSemesterStats({ totalWorkingDays: 0, attendedDays: 0, percentage: 0 });
    }
  };

  /* 🔔 6 PM DAILY NOTIFICATION FLOW */
  const scheduleDailyNotifications = async () => {
    if (Platform.OS === 'web') return;

    // 6 PM: "College hai ya nahi?"
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 College Today?',
        body: 'College hai ya nahi? Reply karo!',
        data: { type: 'college_check' }
      },
      trigger: { hour: 18, minute: 0, repeats: true },
    });
  };

  /* 🌟 NOTIFICATION RESPONSES */
  const handleCollegeCheck = async () => {
    setDailyStatus('checking');
    
    // Ask: College hai ya nahi?
    Alert.alert(
      'College Today?',
      'Aaj college hai?',
      [
        {
          text: 'No (Holiday)',
          style: 'cancel',
          onPress: () => setDailyStatus('idle')
        },
        { 
          text: 'Yes', 
          onPress: () => handleCollegeYes() 
        }
      ]
    );
  };

  const handleCollegeYes = async () => {
    // Ask: Ja rahe ho?
    Alert.alert(
      'College Hai!',
      'College ja rahe ho?',
      [
        {
          text: 'No (Miss)',
          onPress: handleCollegeMiss
        },
        { 
          text: 'Yes (Attend)', 
          onPress: handleCollegeAttend 
        }
      ]
    );
  };

  const handleCollegeAttend = async () => {
    const today = new Date().toDateString();
    try {
      const workingDays = (await getWorkingDays()) || {};
      
      // Denominator +1 (College day), Numerator +1 (Attended)
      workingDays[today] = 'attended';
      await saveWorkingDays(workingDays);

      const newStats = {
        totalWorkingDays: semesterStats.totalWorkingDays + 1,
        attendedDays: semesterStats.attendedDays + 1,
        percentage: Math.round(((semesterStats.attendedDays + 1) / (semesterStats.totalWorkingDays + 1)) * 100)
      };
      
      await saveSemesterStats(newStats);
      setSemesterStats(newStats);
      setDailyStatus('attended');
      
      Alert.alert('✅ Attended!', `Attendance: ${newStats.percentage}%`);
    } catch (error) {
      console.log('Error:', error);
    }
  };

  const handleCollegeMiss = async () => {
    const today = new Date().toDateString();
    try {
      const workingDays = (await getWorkingDays()) || {};
      
      // Denominator +1 (College day), Numerator same (Missed)
      workingDays[today] = 'missed';
      await saveWorkingDays(workingDays);

      const newStats = {
        totalWorkingDays: semesterStats.totalWorkingDays + 1,
        attendedDays: semesterStats.attendedDays,
        percentage: semesterStats.totalWorkingDays > 0 
          ? Math.round((semesterStats.attendedDays / (semesterStats.totalWorkingDays + 1)) * 100)
          : 0
      };
      
      await saveSemesterStats(newStats);
      setSemesterStats(newStats);
      setDailyStatus('missed');
      
      Alert.alert('❌ Missed!', `Attendance: ${newStats.percentage}%`);
    } catch (error) {
      console.log('Error:', error);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Text style={styles.title}>📊 Attendance</Text>
      
      <View style={styles.percentageCard}>
        <Text style={styles.percentage}>
          {semesterStats.percentage}%
        </Text>
        <Text style={styles.details}>
          ({semesterStats.attendedDays}/{semesterStats.totalWorkingDays})
        </Text>
      </View>

      <TouchableOpacity style={styles.checkButton} onPress={handleCollegeCheck}>
        <Text style={styles.checkButtonText}>🔍 Check Today (6 PM Flow)</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        6 PM notification aayegi: "College hai ya nahi?"
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 40, 
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: { 
    color: '#fff', 
    fontSize: 32, 
    fontWeight: 'bold',
    marginBottom: 50,
    textAlign: 'center'
  },
  percentageCard: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    padding: 40,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'rgba(16,185,129,0.5)',
    marginBottom: 40,
    alignItems: 'center'
  },
  percentage: { 
    color: '#10b981', 
    fontSize: 64, 
    fontWeight: '900',
    textAlign: 'center'
  },
  details: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 10
  },
  checkButton: {
    backgroundColor: '#3b82f6',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30
  },
  checkButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 18
  },
  note: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic'
  }
});

