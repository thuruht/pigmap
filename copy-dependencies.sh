#!/bin/bash

# Create the necessary directories
mkdir -p public/lib/ol
mkdir -p public/lib/ol/layer
mkdir -p public/lib/ol/source
mkdir -p public/lib/ol/geom
mkdir -p public/lib/ol/style
mkdir -p public/lib/ol/interaction
mkdir -p public/lib/ol/events

# Copy OpenLayers CSS
cp node_modules/ol/ol.css public/lib/ol/

# Copy needed OpenLayers modules
cp node_modules/ol/Map.js public/lib/ol/
cp node_modules/ol/View.js public/lib/ol/
cp node_modules/ol/layer/Tile.js public/lib/ol/layer/
cp node_modules/ol/source/OSM.js public/lib/ol/source/
cp node_modules/ol/proj.js public/lib/ol/
cp node_modules/ol/layer/Vector.js public/lib/ol/layer/
cp node_modules/ol/source/Vector.js public/lib/ol/source/
cp node_modules/ol/Feature.js public/lib/ol/
cp node_modules/ol/geom/Point.js public/lib/ol/geom/
cp node_modules/ol/style.js public/lib/ol/
cp node_modules/ol/Overlay.js public/lib/ol/
cp node_modules/ol/Geolocation.js public/lib/ol/
cp node_modules/ol/source/XYZ.js public/lib/ol/source/
cp node_modules/ol/interaction.js public/lib/ol/
cp node_modules/ol/interaction/Select.js public/lib/ol/interaction/
cp node_modules/ol/events/condition.js public/lib/ol/events/

# Copy the files needed by the modules above (dependencies)
cp -r node_modules/ol/control public/lib/ol/
cp -r node_modules/ol/coordinate public/lib/ol/
cp -r node_modules/ol/Object.js public/lib/ol/
cp -r node_modules/ol/Observable.js public/lib/ol/
cp -r node_modules/ol/Collection.js public/lib/ol/
cp -r node_modules/ol/CollectionEventType.js public/lib/ol/
cp -r node_modules/ol/array.js public/lib/ol/
cp -r node_modules/ol/asserts.js public/lib/ol/
cp -r node_modules/ol/centerconstraint.js public/lib/ol/
cp -r node_modules/ol/css.js public/lib/ol/
cp -r node_modules/ol/dispose.js public/lib/ol/
cp -r node_modules/ol/easing.js public/lib/ol/
cp -r node_modules/ol/events.js public/lib/ol/
cp -r node_modules/ol/extent.js public/lib/ol/
cp -r node_modules/ol/featureloader.js public/lib/ol/
cp -r node_modules/ol/functions.js public/lib/ol/
cp -r node_modules/ol/has.js public/lib/ol/
cp -r node_modules/ol/Image.js public/lib/ol/
cp -r node_modules/ol/ImageBase.js public/lib/ol/
cp -r node_modules/ol/ImageCanvas.js public/lib/ol/
cp -r node_modules/ol/ImageState.js public/lib/ol/
cp -r node_modules/ol/ImageTile.js public/lib/ol/
cp -r node_modules/ol/interaction.js public/lib/ol/
cp -r node_modules/ol/layer.js public/lib/ol/
cp -r node_modules/ol/layer/Base.js public/lib/ol/layer/
cp -r node_modules/ol/layer/Group.js public/lib/ol/layer/
cp -r node_modules/ol/Layer.js public/lib/ol/
cp -r node_modules/ol/LayerState.js public/lib/ol/
cp -r node_modules/ol/loadingstrategy.js public/lib/ol/
cp -r node_modules/ol/math.js public/lib/ol/
cp -r node_modules/ol/obj.js public/lib/ol/
cp -r node_modules/ol/pixelconstraint.js public/lib/ol/
cp -r node_modules/ol/proj.js public/lib/ol/
cp -r node_modules/ol/proj/epsg3857.js public/lib/ol/proj/
cp -r node_modules/ol/proj/epsg4326.js public/lib/ol/proj/
cp -r node_modules/ol/proj/projection.js public/lib/ol/proj/
cp -r node_modules/ol/proj/units.js public/lib/ol/proj/
cp -r node_modules/ol/resolutionconstraint.js public/lib/ol/
cp -r node_modules/ol/rotationconstraint.js public/lib/ol/
cp -r node_modules/ol/size.js public/lib/ol/
cp -r node_modules/ol/source.js public/lib/ol/
cp -r node_modules/ol/source/Source.js public/lib/ol/source/
cp -r node_modules/ol/source/Tile.js public/lib/ol/source/
cp -r node_modules/ol/source/TileImage.js public/lib/ol/source/
cp -r node_modules/ol/source/UrlTile.js public/lib/ol/source/
cp -r node_modules/ol/sphere.js public/lib/ol/
cp -r node_modules/ol/TileRange.js public/lib/ol/
cp -r node_modules/ol/tilegrid.js public/lib/ol/
cp -r node_modules/ol/TileState.js public/lib/ol/
cp -r node_modules/ol/tileurlfunction.js public/lib/ol/
cp -r node_modules/ol/transform.js public/lib/ol/
cp -r node_modules/ol/util.js public/lib/ol/

# We need to make sure we have all the needed OpenLayers dependencies
# This is a best effort - you might need to add more files if you encounter missing dependencies

# Copy ES Module Shims for older browser support
cp node_modules/es-module-shims/dist/es-module-shims.js public/lib/

echo "Local dependencies copied successfully!"
