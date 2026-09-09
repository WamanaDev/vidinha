import { EnvConfig } from "./env.validation";

/** Factory que expõe o env tipado ao `ConfigModule` (`config.get('key')`). */
export default (): EnvConfig => process.env as unknown as EnvConfig;
