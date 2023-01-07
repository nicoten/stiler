async function up({ context: db }) {
  await db
    .prepare(
      `
  CREATE TABLE workspace (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT,
    map_style TEXT,
    map_center_lat REAL,
    map_center_lng REAL,
    map_zoom INTEGER,
    map_pitch REAL,
    map_bearing REAL,
  
    current_environment_id INTEGER,
    current_sub_environment_id INTEGER,
    FOREIGN KEY (current_environment_id) REFERENCES environment(id),
    FOREIGN KEY (current_sub_environment_id) REFERENCES sub_environment(id)
  )`,
    )
    .run();

  await db
    .prepare(
      `
  CREATE TABLE data_source (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT,
  
    workspace_id INTEGER NOT NULL,
    default_connection_id INTEGER,
    FOREIGN KEY (workspace_id) REFERENCES workspace(id),
    FOREIGN KEY (default_connection_id) REFERENCES connection(id)
  )`,
    )
    .run();

  await db
    .prepare(
      `
  CREATE TABLE connection (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type TEXT,
    color TEXT,
    name TEXT,
    host TEXT,
    port INTEGER,
    database TEXT,
    username TEXT,
    password TEXT,
    ssl BOOLEAN NOT NULL DEFAULT FALSE,
    max_connections INTEGER NOT NULL DEFAULT 5,
  
    data_source_id INTEGER,
    FOREIGN KEY (data_source_id) REFERENCES data_source(id)
  )`,
    )
    .run();

  await db
    .prepare(
      `
  CREATE TABLE layer (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    layer_order INTEGER NOT NULL DEFAULT 0,
    type TEXT,
    name TEXT,
    code TEXT,
    geometry_column TEXT,
    geometry_type_id TEXT,
    fields TEXT,
    style TEXT,
    visible BOOLEAN NOT NULL DEFAULT TRUE,
    min_zoom REAL NOT NULL DEFAULT 0,
    max_zoom REAL NOT NULL DEFAULT 100,
  
    workspace_id INTEGER NOT NULL,
    data_source_id INTEGER,
    FOREIGN KEY (workspace_id) REFERENCES workspace(id),
    FOREIGN KEY (data_source_id) REFERENCES data_source(id)
  )`,
    )
    .run();

  await db
    .prepare(
      `
  CREATE TABLE environment (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name TEXT,
    color TEXT,
    map_center_lat REAL,
    map_center_lng REAL,
    map_zoom INTEGER,
  
    workspace_id INTEGER NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspace(id)
  )`,
    )
    .run();

  await db
    .prepare(
      `
  CREATE TABLE environment_data_source_connection (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    environment_id INTEGER NOT NULL,
    data_source_id INTEGER NOT NULL,
    connection_id INTEGER NOT NULL,
    FOREIGN KEY (environment_id) REFERENCES environment(id),
    FOREIGN KEY (data_source_id) REFERENCES data_source(id),
    FOREIGN KEY (connection_id) REFERENCES connection(id)
  )`,
    )
    .run();

  await db
    .prepare(
      `
  CREATE TABLE sub_environment (
    id INTEGER PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    color TEXT,
    name TEXT,
    json TEXT,
    map_center_lat REAL,
    map_center_lng REAL,
    map_zoom INTEGER,
    
    environment_id INTEGER NOT NULL,
    FOREIGN KEY (environment_id) REFERENCES environment(id)
  )`,
    )
    .run();
}

async function down({ context: queryInterface }) {
  await queryInterface.dropTable('users');
}

module.exports = { up, down };
