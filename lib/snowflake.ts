import snowflake from "snowflake-sdk";

let connection: snowflake.Connection | null = null;

function getConnection(): Promise<snowflake.Connection> {
  return new Promise((resolve, reject) => {
    if (connection && connection.isUp()) {
      // Reuse existing connection
      return resolve(connection);
    }

    // Create a new connection
    connection = snowflake.createConnection({
      account: process.env.SNOWFLAKE_ACCOUNT!,
      username: process.env.SNOWFLAKE_USERNAME!,
      password: process.env.SNOWFLAKE_PASSWORD!,
      warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
      database: process.env.SNOWFLAKE_DATABASE!,
      schema: process.env.SNOWFLAKE_SCHEMA!,
      role: process.env.SNOWFLAKE_ROLE!,
    });

    connection.connect(err => {
      if (err) {
        console.error("Snowflake connection failed:", err.message);
        reject(err);
      } else {
        console.log("Snowflake connected.");
        resolve(connection!);
      }
    });
  });
}

export async function runSnowflake(sql: string, binds: any[] = []): Promise<any> {
  const conn = await getConnection();

  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText: sql,
      binds,
      complete: (err, stmt, rows) => {
        if (err) reject(err);
        else resolve(rows);
      },
    });
  });
}
