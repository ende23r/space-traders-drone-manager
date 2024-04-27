# space-traders-drone-manager
A client for the Space Traders v2 API (https://spacetraders.io/)

Tested with Space Traders API v2.2

## High-level Architecture
For automation, this client uses a basic scheduler. The scheduler runs every 500ms, and does the following tasks:
1. Issue ship commands from the queue
2. Update scheduled timers
  1. If any of the scheduled timers has completed, the scheduler invokes its provided callback.
