import { Stack } from "expo-router";

export default function RootLayout() {
 return <Stack >
  <Stack.Screen name="index" options={{ headerTitle: "Home" }}/>
  <Stack.Screen name="record" options={{ headerShown: false }}/>
  </Stack>

}
