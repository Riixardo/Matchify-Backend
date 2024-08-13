import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
// import { escape } from 'querystring';
// import { Interface } from 'readline';


@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT, 10),
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async addAccessRefreshToken(user: number, access_token: string, refresh_token: string) {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        'DELETE FROM tokens WHERE userid = $1 RETURNING *',
        [user],
      );
      const res2 = await client.query(
        'INSERT INTO tokens VALUES ($1, $2, $3) RETURNING *',
        [user, access_token, refresh_token],
      );
      return res2;
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  // adds (user, blocked_user) to blocks table
  async blockUser(user: number, blocked_user: number) {
    console.log(process.env.DB_PASSWORD as string);
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        'INSERT INTO blocks VALUES ($1, $2) RETURNING *',
        [user, blocked_user],
      );
      return res;
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  // deletes (user, blocked_user) from blocks table
  async unblockUser(user: number, unblocked_user: number) {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        'DELETE FROM blocks WHERE blocker = $1 AND blocked = $2 RETURNING *',
        [user, unblocked_user],
      );
      return res;
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  // message use case
  async add_message(
    messageID: number,
    userID: number,
    threadID: number,
    content: string,
  ) {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        'INSERT INTO message VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
        [messageID, userID, threadID, content],
      );
      console.log(res.rows);
      return res;
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  // removes message from thread
  async remove_message(messageID: number) {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        'DELETE FROM message WHERE messageID = $1 RETURNING *',
        [messageID],
      );
      console.log(res.rows);
      return res;
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  // sends friend request
  async send_friend_request(senderID: number, receiverID: number) {
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        'INSERT INTO friendrequest VALUES ($1, $2) RETURNING *',
        [senderID, receiverID],
      );
      console.log(res.rows);
      return res;
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  // adds sender to receiver's friend list and remove the request from the inbox
  async acceptFriendRequest(receiver_id: number, sender_id: number) {
    console.log(process.env.DB_PASSWORD as string);
    const client = await this.pool.connect();
    // did this to comply with the database constraint for friends
    const userid1 = Math.min(receiver_id, sender_id);
    const userid2 = Math.min(receiver_id, sender_id);
    try {
      const insertFriend = await client.query(
        'INSERT INTO friends (receiver, sender) VALUES ($1, $2) RETURNING *',
        [userid1, userid2]
      );
      console.log(insertFriend.rows);
      const deleteRequest = await client.query(
        'DELETE FROM friendrequest WHERE receiver = $1 AND sender = $2 RETURNING *',
        [receiver_id, sender_id]
      );
      console.log(deleteRequest.rows);
      return {
        insertFriend,
        deleteRequest,
      };
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  // remove sender's request from receiver's inbox
  async declineFriendRequest(receiver_id: number, sender_id: number) {
    console.log(process.env.DB_PASSWORD as string);
    const client = await this.pool.connect();
    try {
      const deleteRequest = await client.query(
        'DELETE FROM friendrequest WHERE receiver = $1 AND sender = $2 RETURNING *',
        [receiver_id, sender_id]
      );
      console.log(deleteRequest.rows);
      return deleteRequest;
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  // create user settings
  async create_userSetting(userid: number) {
    console.log(process.env.DB_PASSWORD as string);
    const client = await this.pool.connect();
    try {
      const create_userSetting = await client.query(
        'INSERT INTO settings (userid, darkMode, privateMode, notification) VALUES ($1, $2, $3, $4) RETURNING *',
        [userid, false, false, false]
      );
      console.log(create_userSetting.rows);
      return create_userSetting.rows[0];
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  // update darkMode setting for user
  async update_darkMode(userid: number) {
    console.log(process.env.DB_PASSWORD as string);
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT darkMode FROM settings WHERE userid = $1',
        [userid]
      );
      const currentDarkMode = result.rows[0].darkMode;
      console.log(currentDarkMode);
      const newDarkMode = !currentDarkMode;
      console.log(newDarkMode);
      const update_darkMode = await client.query(
        'UPDATE settings SET darkMode = $1 WHERE userid = $2 RETURNING *',
        [newDarkMode, userid]
      );
      console.log(update_darkMode.rows);
      return update_darkMode.rows[0];
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  // update private setting for user
  async update_private(userid: number) {
    console.log(process.env.DB_PASSWORD as string);
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT privateMode FROM settings WHERE userid = $1',
        [userid]
      );
      const currentPrivateMode = result.rows[0].privateMode;
      const newPrivateMode = !currentPrivateMode;
      const update_private = await client.query(
        'UPDATE settings SET privateMode = $1 WHERE userid = $2 RETURNING *',
        [newPrivateMode, userid]
      );
      console.log(update_private.rows);
      return update_private.rows[0];
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  // update notification setting for user
  async update_notification(userid: number) {
    console.log(process.env.DB_PASSWORD as string);
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT notification FROM settings WHERE userid = $1',
        [userid]
      );
      const currentNotification = result.rows[0].notification;
      const newNotification = !currentNotification;
      const update_notification = await client.query(
        'UPDATE settings SET notification = $1 WHERE userid = $2 RETURNING *',
          [newNotification, userid]
      );
      console.log(update_notification.rows);
      return update_notification.rows[0];
    } catch (e) {
      console.log(e);
    } finally {
      client.release();
    }
  }

  async unsend_friend_request(senderID: number, receiverID: number) {
        const client = await this.pool.connect();
        try {
            const res = await client.query("DELETE FROM friendrequest WHERE sender = $1 AND receiver = $2 RETURNING *", [senderID, receiverID]);
            console.log(res.rows);
        return res;
        } 
        catch (e) {
            console.log(e);
        } 
        finally {
            client.release();
        }
    }


    private async _check_concert(concert_id: string): Promise<boolean> {
      const client = await this.pool.connect();
      try {
        const res = await client.query<{ concert_count: number }>(
          "SELECT COUNT(*) AS concert_count FROM concert WHERE concertid= $1;",
          [concert_id]
        );
        return (res.rows[0].concert_count >= 1);
      } catch (e) {
        console.log(e);
        throw e;
      } finally {
        client.release();
      }
    }

    // adds upcoming concert to the database
    //  TODO: add genre, artists, etc.
    async update_concerts(concert_list: {
        concert_id: string;
        name: string;
        location: string;
        url: string;
        date: Date;
        image: string;
        venue: string;
    }[]) {
        const client = await this.pool.connect();
        try {
            for (let concert of concert_list) {
                // check if concert already exists
                if (await this._check_concert(concert.concert_id)) {
                    const res = await client.query("INSERT INTO concert VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *", [concert.concert_id, concert.name, concert.location, 
                    concert.url, concert.image, concert.venue, concert.date]);
                    console.log(concert);
                }
                else {
                  console.log("concert already exists");
                }

        }
              // const res = await client.query("INSERT INTO concerts VALUES ($1, $2, $3, $4) RETURNING *", [concertID, concertName, concertDate, concertLocation]);
              // console.log(res.rows);
        // return res;
        } 
        catch (e) {
            console.log(e);
        } 
        finally {
            client.release();
        }
    }


    // delete concerts with dates before the current
    async delete_old_concerts() {
        const client = await this.pool.connect();
        try {
            const res = await client.query("DELETE FROM concert WHERE date < NOW() RETURNING *");
            return res;
        } 
        catch (e) {
            console.log(e);
        } 
        finally {
            client.release();
        }
    }
   
    async search_concert() {
      const client = await this.pool.connect();
      try{

      }
      catch (e){
        console.log(e);
      }
      finally {
        client.release();
      }

    }

    async add_thread(threadID: number, threadName: string) {
        const client = await this.pool.connect();
        try {
            const res = await client.query("INSERT INTO thread VALUES ($1, $2) RETURNING *", [threadID, threadName]);
            console.log(res.rows);
            return res;
        } 
        catch (e) {
            console.log(e);
        } 
        finally {
            client.release();
        }
    }

    async remove_thread(threadID: number) {
        const client = await this.pool.connect();
        try {
            const res = await client.query("DELETE FROM thread WHERE threadID = $1 RETURNING *", [threadID]);
            console.log(res.rows);
            return res;
        } 
        catch (e) {
            console.log(e);
        } 
        finally {
            client.release();
        }
    }

    async add_user_to_concert(userID: number, concertID: string) {
        const client = await this.pool.connect();
        try {
            const res = await client.query("INSERT INTO user_concert VALUES ($1, $2) RETURNING *", [userID, concertID]);
            console.log(res.rows);
            return res;
        } 
        catch (e) {
            console.log(e);
        } 
        finally {
            client.release();
        }
    }

    async remove_user_from_concert(userID: number, concertID: string) {
        const client = await this.pool.connect();
        try {
            const res = await client.query("DELETE FROM user_concert WHERE userID = $1 AND concertID = $2 RETURNING *", [userID, concertID]);
            console.log(res.rows);
            return res;
        } 
        catch (e) {
            console.log(e);
        } 
        finally {
            client.release();
        }
    }

    // if user is attending concert then return 1, else return 0
    async is_user_attending_concert(userID: number, concertID: string) {
        const client = await this.pool.connect();
        try {
            const res = await client.query("SELECT COUNT(*) FROM user_concert WHERE userID = $1 AND concertID = $2", [userID, concertID]);
            return res;
        } 
        catch (e) {
            console.log(e);
        } 
        finally {
            client.release();
        }
    }
}
