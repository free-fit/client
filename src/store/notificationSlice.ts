import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { AppDispatch } from "./store";

interface NotificationState {
  reminderTime: string;
  scheduledReminder: NodeJS.Timeout | null;
  permission: NotificationPermission;
}

const initialState: NotificationState = {
  reminderTime: "12:00",
  scheduledReminder: null,
  permission: "default",
};

export const requestNotificationPermission = createAsyncThunk(
  "notification/requestPermission",
  async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    try {
      // For both desktop and mobile browsers
      const permission = await Notification.requestPermission();

      // If permission is already granted, register the service worker
      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        console.log("Service Worker ready for notifications");
      }

      return permission === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }
);

export const sendNotification = createAsyncThunk(
  "notification/send",
  async (
    { title, options }: { title: string; options?: NotificationOptions },
    { dispatch }
  ) => {
    if (!("Notification" in window)) return;

    if (Notification.permission !== "granted") {
      const result = await dispatch(requestNotificationPermission()).unwrap();
      if (!result) return;
    }

    const registration = await navigator.serviceWorker.ready;

    try {
      new Notification(title, {
        icon: "/fit-track/icons/icon-192x192.png",
        badge: "/fit-track/icons/icon-192x192.png",
        requireInteraction: true,
        ...options,
      });
    } catch (e) {
      await registration.showNotification(title, {
        icon: "/fit-track/icons/icon-192x192.png",
        badge: "/fit-track/icons/icon-192x192.png",
        requireInteraction: true,
        ...options,
      });
    }
  }
);

export const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    setReminderTime: (state, action: PayloadAction<string>) => {
      state.reminderTime = action.payload;

      if (state.scheduledReminder) {
        clearTimeout(state.scheduledReminder);
      }

      const [hours, minutes] = action.payload.split(":").map(Number);
      const now = new Date();
      const reminderDate = new Date();

      // Set time in local timezone
      reminderDate.setHours(hours, minutes, 0, 0);
      const localISOString = new Date(
        reminderDate.getTime() - reminderDate.getTimezoneOffset() * 60000
      ).toISOString();

      let timeUntilReminder = reminderDate.getTime() - now.getTime();
      console.log(
        "Time until reminder:",
        timeUntilReminder,
        "Local time:",
        reminderDate.toLocaleString()
      );

      // Schedule for tomorrow if time has passed
      if (timeUntilReminder < 0) {
        reminderDate.setDate(reminderDate.getDate() + 1);
        timeUntilReminder = reminderDate.getTime() - now.getTime();
      }

      // Store the next reminder time with timezone offset
      localStorage.setItem("nextReminderTime", localISOString);

      const showNotification = () => {
        console.log("Showing notification");
        if (Notification.permission === "granted") {
          try {
            new Notification("Workout Reminder", {
              body: "Time for your daily workout!",
              icon: "/fit-track/icons/icon-192x192.png",
              badge: "/fit-track/icons/icon-192x192.png",
              requireInteraction: true,
            });
          } catch (e) {
            console.error("Native notification failed:", e);
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification("Workout Reminder", {
                body: "Time for your daily workout!",
                icon: "/fit-track/icons/icon-192x192.png",
                badge: "/fit-track/icons/icon-192x192.png",
                requireInteraction: true,
              });
            });
          }
        }
      };

      // Show immediately if within a minute
      if (Math.abs(timeUntilReminder) < 60000) {
        console.log("Showing immediate notification");
        showNotification();
      }

      state.scheduledReminder = setTimeout(showNotification, timeUntilReminder);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(
      requestNotificationPermission.fulfilled,
      (state, action) => {
        state.permission = action.payload ? "granted" : "denied";
      }
    );
  },
});

export const { setReminderTime } = notificationSlice.actions;
export default notificationSlice.reducer;

// Add this to check and reschedule notifications on app load
export const checkAndRescheduleNotification = () => (dispatch: AppDispatch) => {
  const nextReminderTime = localStorage.getItem("nextReminderTime");
  if (nextReminderTime) {
    const reminderDate = new Date(nextReminderTime);
    const now = new Date();
    if (reminderDate > now) {
      const [hours, minutes] = [
        reminderDate.getHours(),
        reminderDate.getMinutes(),
      ];
      dispatch(
        setReminderTime(
          `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}`
        )
      );
    }
  }
};
