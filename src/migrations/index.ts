import * as migration_20260318_094949 from './20260318_094949';
import * as migration_20261123_222628_upgrade_payload_3_94 from './20261123_222628_upgrade_payload_3_94';

export const migrations = [
  {
    up: migration_20260318_094949.up,
    down: migration_20260318_094949.down,
    name: '20260318_094949',
  },
  {
    up: migration_20261123_222628_upgrade_payload_3_94.up,
    down: migration_20261123_222628_upgrade_payload_3_94.down,
    name: '20261123_222628_upgrade_payload_3_94'
  },
];
