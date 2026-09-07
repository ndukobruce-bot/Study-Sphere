import { Redirect } from "expo-router";
import { usePreferencesStore } from "../src/store/preferencesStore";

export default function Index() {
  const hasOnboarded = usePreferencesStore(state => state.hasOnboarded);
  return <Redirect href={hasOnboarded ? "/(tabs)/home" : "/onboarding"} />;
}
