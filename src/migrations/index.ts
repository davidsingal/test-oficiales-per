import * as migration_20260318_094949 from './20260318_094949';
import * as migration_20261123_222628_upgrade_payload_3_94 from './20261123_222628_upgrade_payload_3_94';
import * as migration_20261125_124255_add_question_source_url from './20261125_124255_add_question_source_url';

export const migrations = [
  {
    up: migration_20260318_094949.up,
    down: migration_20260318_094949.down,
    name: '20260318_094949',
  },
  {
    up: migration_20261123_222628_upgrade_payload_3_94.up,
    down: migration_20261123_222628_upgrade_payload_3_94.down,
    name: '20261123_222628_upgrade_payload_3_94',
  },
  {
    up: migration_20261125_124255_add_question_source_url.up,
    down: migration_20261125_124255_add_question_source_url.down,
    name: '20261125_124255_add_question_source_url'
  },
];
