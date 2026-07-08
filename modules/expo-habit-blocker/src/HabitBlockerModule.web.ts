import { registerWebModule, NativeModule } from 'expo';

// HabitBlockerModule is not available on the web platform.
class HabitBlockerModule extends NativeModule<{}> {}

export default registerWebModule(HabitBlockerModule, 'HabitBlockerModule');
