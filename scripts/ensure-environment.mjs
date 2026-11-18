// Creates src/environments/environment.ts from the example when it is missing.
import { copyFileSync, existsSync } from 'node:fs';

const target = 'src/environments/environment.ts';
const example = 'src/environments/environment.example.ts';

if (!existsSync(target)) {
  copyFileSync(example, target);
  console.log(`Created ${target} from ${example}`);
}
