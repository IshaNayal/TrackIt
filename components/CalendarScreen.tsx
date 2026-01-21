import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';
import {
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
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

export default function CalendarScreen() {
  const todayISO = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [modalVisible, setModalVisible] = useState(false);
  const [taskText, setTaskText] = useState('');
  const [tasks, setTasks] = useState<TasksMap>({});
  const [reminderTime, setReminderTime] = useState('20:00');

  const formattedDate = selectedDate.split('-').reverse().join('/');

  const year = new Date().getFullYear();

  const monthImages = [
    require('./(tabs)/assets/images/january.jpg'),
    require('./(tabs)/assets/images/feb.jpg'),
    require('./(tabs)/assets/images/march.jpg'),
    require('./(tabs)/assets/images/ap (2).jpg'),
    require('./(tabs)/assets/images/may.jpg'),
    require('./(tabs)/assets/images/june.jpg'),
    require('./(tabs)/assets/images/july.jpg'),
    require('./(tabs)/assets/images/aug.jpg'),
    require('./(tabs)/assets/images/sept.jpg'),
    require('./(tabs)/assets/images/oct.jpg'),
    require('./(tabs)/assets/images/nov.jpg'),
    require('./(tabs)/assets/images/new year.jpg'),
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
    'Celebrate how far you’ve come ✨',
  ];

  /* 🔁 INITIAL LOAD */
  useEffect(() => {
    loadTasks();
    requestPermissions();
    setupAndroidChannel();
  }, []);

  const loadTasks = async () => {
    const data = await AsyncStorage.getItem('TASKS');
    if (data) setTasks(JSON.parse(data));
  };

  const requestPermissions = async () => {
    await Notifications.requestPermissionsAsync();
  };

  const setupAndroidChannel = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });
    }
  };

  /* ➕ ADD TASK */
  const addTask = async () => {
    if (!taskText.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      text: taskText.trim(),
      done: false,
      reminderTime,
    };

    const updated = {
      ...tasks,
      [selectedDate]: [...(tasks[selectedDate] || []), newTask],
    };

    await persist(updated);
    setTaskText('');

    // Schedule notification asynchronously
    scheduleTaskReminder(selectedDate)
      .then((id) => {
        updated[selectedDate][updated[selectedDate].length - 1].notificationId = id;
        persist(updated);
      })
      .catch(console.log);
  };

  const deleteTask = async (index: number) => {
    const updated = [...(tasks[selectedDate] || [])];
    const task = updated[index];

    if (task.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(task.notificationId);
    }

    updated.splice(index, 1);
    await persist({ ...tasks, [selectedDate]: updated });
  };

  const toggleTask = async (index: number) => {
    const updated = [...(tasks[selectedDate] || [])];
    updated[index].done = !updated[index].done;
    await persist({ ...tasks, [selectedDate]: updated });
  };

  const persist = async (data: TasksMap) => {
    setTasks(data);
    await AsyncStorage.setItem('TASKS', JSON.stringify(data));
  };

  const scheduleTaskReminder = async (date: string) => {
    const [hour, minute] = reminderTime.split(':').map(Number);
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Task Reminder',
        body: `You have tasks for ${date.split('-').reverse().join('/')}`,
      },
      trigger: { hour, minute },
    });
  };

  /* 📌 MARKED DATES */
  const markedDates: any = {};
  Object.keys(tasks).forEach((d) => (markedDates[d] = { marked: true }));
  markedDates[selectedDate] = { selected: true, selectedColor: '#4f46e5' };

  return (
    <ImageBackground source={monthImages[currentMonth]} resizeMode="cover" style={styles.page}>
      <BlurView intensity={20} tint="light" style={styles.glass}>
        <Calendar
          hideArrows
          current={`${year}-${String(currentMonth + 1).padStart(2, '0')}-01`}
          enableSwipeMonths={false}
          onDayPress={(day: DateData) => {
            setSelectedDate(day.dateString);
            setModalVisible(true);
          }}
          markedDates={markedDates}
          theme={{
            calendarBackground: 'transparent',
            backgroundColor: 'transparent',
            todayTextColor: '#e11d48',
            arrowColor: '#4f46e5',
            dayTextColor: '#111',
            monthTextColor: '#111',
          }}
          style={{ height: 370 }}
        />
      </BlurView>

      <Text style={styles.date}>📆 {new Date(selectedDate).toDateString()}</Text>
      <Text style={styles.quote}>“{monthQuotes[currentMonth]}”</Text>

      {/* 🧾 MODAL */}
      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalRoot}>
          {/* Full modal background image */}
          <ImageBackground
            source={require('./(tabs)/assets/images/moti.png')}  // ✅ tabs/assets/
            resizeMode="contain"
            style={[styles.modalBgImageFull, { transform: [{ translateY: -160 }] }]}
          />

          {/* Semi-transparent overlay for readability */}
          <View style={styles.overlay} />

          {/* Task box overlay */}
          <View style={styles.taskBox}>
            <Text style={styles.title}>Task for  {formattedDate}</Text>

            {/* Reminder input */}
            <TextInput
              value={reminderTime}
              onChangeText={setReminderTime}
              placeholder="00:00"
              placeholderTextColor="#000"
              style={styles.input}
            />

            {/* Tasks list */}
            <ScrollView style={{ maxHeight: 200 }}>
              {(tasks[selectedDate] || []).map((t: Task, i: number) => (
                <View key={t.id} style={styles.taskRow}>
                  <TouchableOpacity onPress={() => toggleTask(i)}>
                    <Text style={[styles.taskText, t.done && styles.taskTextDone]}>
                      {t.done ? '☑️' : '⬜'} {t.text}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteTask(i)}>
                    <Text>❌</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            {/* Add task input */}
            <TextInput
              value={taskText}
              onChangeText={setTaskText}
              placeholder="Add task..."
              placeholderTextColor="#000"
              style={styles.input}
            />

            {/* Buttons */}
            <TouchableOpacity onPress={addTask} style={styles.button}>
              <Text style={styles.buttonText}>➕ Add</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.button}>
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // Page & Calendar
  page: { flex: 1, padding: 16, paddingTop: 80 },
  glass: { borderRadius: 18, overflow: 'hidden' },
  date: { marginTop: 20, fontSize: 20, color: '#000000ff', textAlign: 'center' },
  quote: { marginTop: 140, fontSize: 20, color: '#fff', fontStyle: 'italic', textAlign: 'center' },

  // Modal root
  modalRoot: {
    flex: 1,
    backgroundColor: '#000', // fallback in case image takes time to load
  },

  // Full-screen modal background image
  modalBgImageFull: {
    ...StyleSheet.absoluteFillObject, // fills entire modal
    width: '100%',
    height: '100%',
  },

  // Semi-transparent overlay for readability
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Task box overlay
  taskBox: {
    position: 'absolute',
    bottom: 0,  // ✅ Bottom से start करेगा (280px बहुत नीचे था)
    left: 20,
    right: 20,
    top: 100,   // ✅ Top से 100px नीचे से start
    padding: 25,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },

  // Task box title
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#FF1493'
  },

  // TextInput for reminders or adding tasks
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',  // ✅ Fixed missing )
    color: 'black',  // ✅ BLACK user input text
  },



  // Buttons
  button: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },


  buttonText: {
    color: '#000000ff',
    fontWeight: '700',
    textAlign: 'center',
  },

  // Individual task row
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  taskText: {
    color: 'white',
    fontWeight: '700',
  },
  taskTextDone: {
    textDecorationLine: 'line-through',
  },
});