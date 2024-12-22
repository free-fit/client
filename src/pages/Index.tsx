import { HeroSection } from "@/components/sections/HeroSection";
import { WorkoutPlannerSection } from "@/components/sections/WorkoutPlannerSection";
import { FeaturedWorkoutsSection } from "@/components/sections/FeaturedWorkoutsSection";
import { featuredWorkouts } from "@/data/workouts";
import { ExercisesSection } from "@/components/sections/ExercisesSection";

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <FeaturedWorkoutsSection featuredWorkouts={featuredWorkouts} />
      <ExercisesSection />
      <WorkoutPlannerSection />
    </div>
  );
}
