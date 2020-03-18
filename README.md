# mobile-3d-backend
 Backend for the Mobile3D printer

## How to use?

1. Open Powershell, or any other commandline in the root folder of the project

2. Install dependencies:

   - `npm install -g nodemon`
   - `npm install`

3. Start the Backend

   `sudo npm start`
   
   
### Running in autostart

1. Open crontab

   `crontab -e`
   
2. Add the following line at the end

   `@reboot sudo /bin/bash /home/pi/mobile-3d-backend/start.sh`
