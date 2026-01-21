import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  ImageBackground,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// WEB-SAFE NOTIFICATION HANDLER
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: Platform.OS !== 'web',
    shouldPlaySound: Platform.OS !== 'web',
    shouldSetBadge: false,
  }),
});

type Task = {
  id: string;
  text: string;
  done: boolean;
  reminderTime: string;
  notificationId?: string;
};

type TasksMap = Record<string, Task[]>;

interface MonthChangeEvent {
  dateString: string;
  date?: Date;
  day?: number;
  month: number;
  year: number;
}

export default function CalendarScreen() {
  const todayISO = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [modalVisible, setModalVisible] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [tasks, setTasks] = useState<TasksMap>({});
  const [reminderTime, setReminderTime] = useState('20:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [hour, setHour] = useState(20);
  const [minute, setMinute] = useState(0);

  const translateX = useSharedValue(0);

  const year = new Date().getFullYear();

  const monthImages = [
    require('./assets/images/january.jpg'),
    require('./assets/images/feb.jpg'),
    require('./assets/images/march.jpg'),
    require('./assets/images/ap (2).jpg'),
    require('./assets/images/may.jpg'),
    require('./assets/images/june.jpg'),
    require('./assets/images/july.jpg'),
    require('./assets/images/aug.jpg'),
    require('./assets/images/sept.jpg'),
    require('./assets/images/oct.jpg'),
    require('./assets/images/nov.jpg'),
    require('./assets/images/new year.jpg'),
  ];

  const monthQuotes = [
    'Find what you love and let it kill you🌱',
    'Love grows with patience ❤️',
    'Bloom with confidence 🌸',
    'Every drop brings growth 🌧️',
    'Let life unfold 🍃',
    'Shine brighter ☀️',
    'Chase the sunshine 🌻',
    'Grow through challenges 🌿',
    'Stay focused 🍂',
    'Change is beautiful 🍁',
    'Grateful hearts glow 🤎',
    'Celebrate how far you\'ve come ✨',
  ];

  /* 🔁 INITIAL LOAD */
  useEffect(() => {
    loadTasks();
    if (Platform.OS !== 'web') {
      requestPermissions();
      setupAndroidChannel();
    }
  }, []);

  const loadTasks = async (): Promise<void> => {
    try {
      const data = await AsyncStorage.getItem('TASKS');
      if (data) setTasks(JSON.parse(data));
    } catch (error) {
      console.log('Error loading tasks:', error);
    }
  };

  const requestPermissions = async (): Promise<void> => {
    await Notifications.requestPermissionsAsync();
  };

  const setupAndroidChannel = async (): Promise<void> => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });
    }
  };

  /* 🕹️ SWIPE GESTURE HANDLER */
  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => { },
    onActive: (event) => {
      translateX.value = event.translationX;
    },
    onEnd: (event) => {
      const threshold = screenWidth * 0.3;
      if (Math.abs(event.translationX) > threshold) {
        const direction = event.translationX > 0 ? -1 : 1;
        const newMonth = currentMonth + direction;
        if (newMonth >= 0 && newMonth <= 11) {
          runOnJS(setCurrentMonth)(newMonth);
        }
      }
      translateX.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const addTask = async (): Promise<void> => {
    if (!taskText.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      text: taskText.trim(),
      done: false,
      reminderTime,
    };

    const updatedTasks: TasksMap = {
      ...tasks,
      [selectedDate]: [...(tasks[selectedDate] || []), newTask],
    };

    await persist(updatedTasks);
    setTaskText('');

    if (Platform.OS !== 'web') {
      try {
        const notificationId = await scheduleTaskReminder(selectedDate);
        updatedTasks[selectedDate]![updatedTasks[selectedDate]!.length - 1].notificationId = notificationId;
        await persist(updatedTasks);
      } catch (error) {
        console.log('Notification error:', error);
      }
    }
  };

  const deleteTask = async (index: number): Promise<void> => {
    const updated = [...(tasks[selectedDate] || [])];
    const task = updated[index];

    if (task?.notificationId && Platform.OS !== 'web') {
      await Notifications.cancelScheduledNotificationAsync(task.notificationId);
    }

    updated.splice(index, 1);
    const updatedTasks: TasksMap = { ...tasks, [selectedDate]: updated };
    await persist(updatedTasks);
  };

  const toggleTask = async (index: number): Promise<void> => {
    const updated = [...(tasks[selectedDate] || [])];
    if (updated[index]) {
      updated[index]!.done = !updated[index]!.done;
    }
    const updatedTasks: TasksMap = { ...tasks, [selectedDate]: updated };
    await persist(updatedTasks);
  };

  const persist = async (data: TasksMap): Promise<void> => {
    try {
      setTasks(data);
      await AsyncStorage.setItem('TASKS', JSON.stringify(data));
    } catch (error) {
      console.log('Error saving tasks:', error);
    }
  };

  const scheduleTaskReminder = async (date: string): Promise<string> => {
    const [hour, minute] = reminderTime.split(':').map(Number);
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Task Reminder',
        body: `You have tasks for ${date.split('-').reverse().join('/')}`,
      },
      trigger: { hour, minute },
    });
  };

  const handleMonthChange = useCallback((monthObj: MonthChangeEvent) => {
    setCurrentMonth(monthObj.month - 1);
  }, []);

  /* ✅ MARKED DATES */
  const markedDates: Record<string, any> = {};
  Object.keys(tasks).forEach((date) => {
    markedDates[date] = { marked: true, dotColor: '#4f46e5' };
  });

  if (selectedDate) {
    markedDates[selectedDate] = {
      selected: true,
      selectedColor: '#4f46e5',
      selectedTextColor: '#fff'
    };
  }

  const currentMonthImage = monthImages[currentMonth];

  /* ⏰ TIME INPUT WITH AUTO-FORMAT */
  const updateReminderTime = (text: string) => {
    let formatted = text.replace(/[^0-9:]/g, '').slice(0, 5);
    if (text.length === 2 && !formatted.includes(':')) {
      formatted += ':';
    }
    setReminderTime(formatted);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <ImageBackground
          source={currentMonthImage}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          {!modalVisible && <View style={styles.overlayMain} />}

          <PanGestureHandler onGestureEvent={gestureHandler}>
            <Animated.View style={[styles.swipeContainer, animatedStyle]}>
              <View style={styles.container}>
                {!modalVisible && <Text style={styles.title}>📅 Calendar</Text>}

                {!modalVisible && (
                  <>
                    <Calendar
                      current={`${year}-${String(currentMonth + 1).padStart(2, '0')}-01`}
                      onDayPress={(day: DateData) => {
                        setSelectedDate(day.dateString);
                        setModalVisible(true);
                      }}
                      onMonthChange={handleMonthChange}
                      markedDates={markedDates}
                      theme={{
                        backgroundColor: 'rgba(255,255,255,0.12)',
                        calendarBackground: 'rgba(0,0,0,0.2)',
                        outerCircleColor: 'rgba(255,255,255,0.1)',
                        textSectionTitleColor: '#fff',
                        textSectionTitleDisabledColor: 'rgba(255,255,255,0.4)',
                        todayTextColor: '#ff6b6b',
                        dayTextColor: '#fff',
                        textInactiveColor: 'rgba(255,255,255,0.6)',
                        monthTextColor: '#fff',
                        textDayHeaderFontColor: '#fff',
                        selectedDayBackgroundColor: '#4f46e5',
                        selectedDayTextColor: '#fff',
                        arrowColor: '#ffffff',
                        arrowSize: 1000,
                        textDayFontSize: screenWidth > 400 ? 18 : 16,
                        textMonthFontSize: screenWidth > 400 ? 24 : 20,
                        textDayHeaderFontSize: screenWidth > 400 ? 14 : 12,
                        textDayFontWeight: '600',
                        textMonthFontWeight: '800',
                        textDayHeaderFontWeight: '600',
                      }}
                      style={[
                        styles.calendar,
                        {
                          height: screenHeight > 800 ? 420 : 380,
                          borderRadius: screenWidth > 400 ? 25 : 20,
                        }
                      ]}
                    />

                    <Text style={styles.selectedDate}>
                      Selected: {new Date(selectedDate).toLocaleDateString()}
                    </Text>

                    <Text style={styles.quote} numberOfLines={2}>
                      "{monthQuotes[currentMonth]}"
                    </Text>
                  </>
                )}
              </View>
            </Animated.View>
          </PanGestureHandler>

          {/* MODAL */}




          {/* ✅ FIXED COMPLETE MODAL - सभी original features + time picker */}
          <Modal transparent visible={modalVisible} animationType="slide">
            <View style={styles.modalRoot}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => setModalVisible(false)}
              />
              <ImageBackground
                source={require('./assets/images/moti.png')}
                style={styles.modalBgImageFull}
                resizeMode="cover"
                imageStyle={{ borderRadius: 25 }}
              >
                <View style={styles.taskBox}>
                  {/* ✅ DATE TITLE */}
                  <Text style={styles.modalTitle}>
                    Tasks for {new Date(selectedDate).toLocaleDateString()}
                  </Text>

                  {/* ✅ ROLLING TIME PICKER BUTTON */}
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={styles.timeDisplay}>
                      {hour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>

                  {/* ✅ TIME PICKER MODAL (nested) */}
                  <Modal transparent visible={showTimePicker} animationType="fade">
                    <TouchableOpacity
                      style={styles.timePickerBackdrop}
                      activeOpacity={1}
                      onPress={() => setShowTimePicker(false)}
                    />
                    <View style={styles.timePickerContainer}>
                      {/* HOUR */}
                      <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                        {Array.from({ length: 24 }, (_, i) => (
                          <TouchableOpacity
                            key={`h${i}`}
                            style={styles.pickerItem}
                            onPress={() => {
                              setHour(i);
                              setReminderTime(`${i.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
                            }}
                          >
                            <Text style={[styles.pickerText, i === hour && styles.pickerTextSelected]}>
                              {i.toString().padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <Text style={styles.colon}>:</Text>

                      {/* MINUTE */}
                      <ScrollView style={styles.pickerScroll} showsVerticalScrollIndicator={false}>
                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                          <TouchableOpacity
                            key={`m${m}`}
                            style={styles.pickerItem}
                            onPress={() => {
                              setMinute(m);
                              setReminderTime(`${hour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                            }}
                          >
                            <Text style={[styles.pickerText, m === minute && styles.pickerTextSelected]}>
                              {m.toString().padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      <TouchableOpacity style={styles.doneButton} onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.doneText}>✓</Text>
                      </TouchableOpacity>
                    </View>
                  </Modal>

                  {/* ✅ ALL ORIGINAL FEATURES BACK */}
                  

                  {/* ✅ TASKS LIST */}
                  <ScrollView
                    style={styles.scrollView}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    {(tasks[selectedDate] || []).map((t: Task, i: number) => (
                      <View key={t.id} style={styles.taskRow}>
                        <TouchableOpacity
                          onPress={() => toggleTask(i)}
                          style={styles.taskTouchable}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.taskText, t.done && styles.taskTextDone]}>
                            {t.done ? '☑️' : '⬜'} {t.text}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => deleteTask(i)}
                          style={styles.deleteButton}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.deleteText}>❌</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>

                  {/* ✅ ADD TASK INPUT */}
                  <TextInput
                    value={taskText}
                    onChangeText={setTaskText}
                    placeholder="Add new task..."
                    placeholderTextColor="#666"
                    style={styles.input}
                    multiline={false}
                    maxLength={100}
                  />

                  {/* ✅ BUTTONS */}
                  <TouchableOpacity onPress={addTask} style={styles.button} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>➕ Add Task</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton} activeOpacity={0.8}>
                    <Text style={styles.buttonText}>✕ Close</Text>
                  </TouchableOpacity>
                </View>
              </ImageBackground>
            </View>
          </Modal>






        </ImageBackground>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: screenWidth * 1.02,
    height: screenHeight,
  },
  overlayMain: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0)',
  },
  swipeContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 10 : 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 25,
    textAlign: 'center',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 8,
  },
  calendar: {
    backgroundColor: 'rgba(255, 255, 255, 0.17)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  selectedDate: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 15,
    color: '#fff',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 6,
  },
  quote: {
    fontSize: 18,
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#fff',
    fontWeight: '600',
    paddingHorizontal: 15,
    lineHeight: 26,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 6,
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 229, 229, 0)',
  },
  modalBgImageFull: {
    width: screenWidth * 0.95,  // FIXED: 95% width
    height: screenHeight * 0.75,
    position: 'absolute',
    top: screenHeight * 0.08,
    left: screenWidth * 0.025,
    borderRadius: 25,
    overflow: 'hidden',
  },
  taskBox: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    padding: 30,
    backgroundColor: 'rgba(9, 9, 9, 0)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(248, 13, 13, 0.55)',
    // ✅ Subtle inner glow
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(248, 13, 13, 0.55)',
    shadowColor: 'rgba(106, 9, 9, 0.03)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 25,
    elevation: 30,
  },

  modalTitle: {
    fontSize: 50,
    fontWeight: '800',
    marginBottom: 25,
    color: '#681111',
    textAlign: 'center',
  },
  input: {
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.96)',
    borderRadius: 15,
    padding: 16,
    marginVertical: 10,
    backgroundColor: 'rgba(254, 254, 254, 0.16)',
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  scrollView: {
    maxHeight: 150,
  },
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgb(0, 0, 0)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(79,70,229,0.2)',
    paddingVertical: 15,
    paddingHorizontal: 18,
    marginVertical: 12,
  },
  taskTouchable: {
    flex: 1,
  },
  taskText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 17,
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
    color: '#ffffff',
    opacity: 0.8,
  },
  deleteButton: {
    marginLeft: 15,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  deleteText: {
    color: '#ef4444',
    fontWeight: '800',
    fontSize: 20,
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginTop: 15,
  },
  closeButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 15,
    marginTop: 15,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 17,
  },
  timePickerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginVertical: 15,
  },
  timeDisplay: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
  },
  timePickerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  timePickerContainer: {
    position: 'absolute',
    bottom: 300,
    left: 40,
    right: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 25,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerScroll: {
    height: 200,
    width: 80,
  },
  pickerItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 24,
    color: '#333',
  },
  pickerTextSelected: {
    color: '#4f46e5',
    fontWeight: '800',
    fontSize: 28,
  },
  colon: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    marginHorizontal: 10,
  },
  doneButton: {
    padding: 15,
    backgroundColor: '#4f46e5',
    borderRadius: 25,
  },
  doneText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },

});
