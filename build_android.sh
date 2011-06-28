#!/bin/sh

WEBAPP_DIR="mobile_webapp"
ANDROID_WEBAPP_DIR=`echo $WEBAPP_DIR'_android/'`

if [ -d $WEBAPP_DIR ]; then
  
  echo 'Building '$WEBAPP_DIR'_android ...'
  echo 'For target device: '$ANDROID_SERIAL

  # Remove previous Android build if exists.

  rm -Rf $ANDROID_WEBAPP_DIR
  
  # Needed this utility from Phonegap
  # in order to obtain the native Android app.
  
  hash droidgap 2>&- || { echo >&2 "I require *droidgap* but it's not installed. Aborting."; exit 1; }

  droidgap create `pwd`/$WEBAPP_DIR
  
  # Copy launch icons from design directory.

  cp -Rf design/android/res/* $ANDROID_WEBAPP_DIR/res

  echo 'Done building webapp.'
  echo 'Installing generated app on target device...'

  cd $ANDROID_WEBAPP_DIR
  
  hash ant 2>&- || { echo >&2 "I require *ant* but it's not installed. Aborting."; exit 1; }

  ant debug install && adb logcat Web:* webcore:* *:S

else
  
  echo 'Failed Build!'
  echo 'Directory *'$WEBAPP_DIR'* not found.'
  exit 0

fi
