# 0.9.10 collection rendering correction

The 0.9.9 collection rail was accidentally selected by the title-rail renderer and overwritten. Collection rails are now excluded. All category filter buttons are shown; empty provider libraries replace sample rails rather than leaving them on screen. Opening a collection shows the returned category titles. The provider response currently caps titles at 180 per category; larger-library pagination remains outstanding.

Browser verification with fixture provider data at 1920x1080: all 15 movie collection tiles retained, Back to the Future category opens, Series uses native series categories, local service SVGs render, Home/Movies/Series cards have identical dimensions, Kids hidden for Mike/Amy and visible for Alfie/Brooke/Elsie-Joan, and Series settings shows only series categories. Live supplier verification is still required.

Local logo assets: Simple Icons 11.15.0, https://github.com/simple-icons/simple-icons/tree/11.15.0 (CC0 project; service trademarks belong to their owners).
