





steps to update password
1. echo -n 'guacadmin' | sha256sum

3dfdec241bf8bccdd9c33de9821e56a9fa799c3daf6c7d5fe8f26cbe30057546
c85d54481769fa00deda18d582128f62cc37ecb779d470b0d73b26a492c431c6
f3293a1a94713ed45a8f23d84f41b41c670a7ae6fef7b05a2b0ba47a06061f43

2. 

MariaDB [guacamole_db]> select * from guacamole_entity where name='guacadmin';
+-----------+-----------+------+
| entity_id | name      | type |
+-----------+-----------+------+
|         1 | guacadmin | USER |
+-----------+-----------+------+
1 row in set (0.001 sec)

MariaDB [guacamole_db]> UPDATE guacamole_user SET password_hash = UNHEX('f3293a1a94713ed45a8f23d84f41b41c670a7ae6fef7b05a2b0ba47a06061f43'), password_salt = NULL, disabled = 0 WHERE user_id = 1; 
Query OK, 1 row affected (0.086 sec)
Rows matched: 1  Changed: 1  Warnings: 0

MariaDB [guacamole_db]> Ctrl-C -- exit!
Aborted
cloud@cdacvirtuallab:~$ sudo -s
[sudo] password for cloud: 
root@cdacvirtuallab:/home/cloud# sudo systemctl restart tomcat9
root@cdacvirtuallab:/home/cloud# sudo systemctl restart guacd


follow above steps if want to update password































'vcpus',
'vcpus_used',
'memory_free',
'memory_size',
'memory_used',
local_disk_free',
'local_disk_size',
'local_disk_used',

