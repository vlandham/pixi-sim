const su = new SpriteUtilities(PIXI);

const b = new Bump(PIXI);

let currentId = 1;

const TILESIZE = 16;
var AGENT_COLORS = ['blue', 'green', 'red', 'white']
var AGENT_HAIR = ['black', 'blonde', 'brown']
var AGENT_COLOR_DISPLAY = {blue:'#3C8BE8', green:'#18CB16', red:'#D72300', white:'white'}

let rand = function(i) {
  return Math.floor(Math.random()*i);
};

let updateRollingAve = function (current, incremental) {
  return current * (STAT_ROLL-1)/STAT_ROLL + incremental/STAT_ROLL;
};

let sameLoc = function(a,b) {
  return a.x == b.x && a.y == b.y;
};

let getDist = function(a,b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};


let PACK = function(){
  throw new Error("PACK not yet initialized");
};

class MapMaker {
  constructor(cols, rows, tilesize) {
    this.generate = this.generate.bind(this);
    this.rows = rows;
    this.cols = cols;
    this.tilesize = tilesize;
    this.tiles = [];
  }

  createArray(length) {
    var arr = new Array(length || 0);
    var i = length;

    if (arguments.length > 1) {
      var args = Array.prototype.slice.call(arguments, 1);
      while(i--) arr[length-1 - i] = this.createArray.apply(this, args);
    }

    return arr;
  }

  toGrid(tiles) {
    return tiles.map(function(row) {
      return row.map((d) => d.blocked ? 1 : 0)
    })
  }



  generate() {

    function isNotStreet(x, y, cols, rows) {
      return x < 0 || x >= cols || y < 0 || y >= rows || // in bounds
      (x % 2 == 1 && y % 2 == 1); // not a 'pillar'
    }

    // function isNotStreet(x, y, cols, rows) {
    //   return x < 0 || x >= cols || y < 0 || y >= rows || // in bounds
    //   Math.random() > 0.88
    // }

    this.tiles = this.createArray(this.cols, this.rows)

    for (var x = 0; x < this.cols; x++) {
      for (var y = 0; y < this.rows; y++) {
        let tilePos = null;
        let isPlaza = false;
        if (x == 0 && y == 0) tilePos = [20,2];
        else if (x == 0 && y == this.rows-1) tilePos = [20,3];
        else if (x == this.cols-1 && y == 0) tilePos = [21,2];
        else if (x == this.cols-1 && y == this.rows-1) tilePos = [21,3];


        // sides
        else if ((x == 0 || x == this.cols-1) && y % 2 == 1) tilePos = [19,3];
        else if ((y == 0 || y == this.rows-1) && x % 2 == 1) tilePos = [18,2];

        else if (x == 0) tilePos = [22,2];
        else if (x == this.cols-1) tilePos = [22,3];
        else if (y == 0) tilePos = [23,3];
        else if (y == this.rows-1) tilePos = [23,2];

        // middle
        else {
          if (isNotStreet(x,y, this.cols, this.rows)) {
            //									tilePos = [3 + rand(7),27];
            //									tilePos = [1,27]; // grass
            //									tilePos = [1,26]; // grass
            //									tilePos = [9,27]; // dirt
            //									tilePos = [11, 0]; // street
            tilePos = [31, 1]; // street
            isPlaza = true;
          }
          //								if (this._isNotStreet(x,y)) tilePos = [1,3]
          // else if (isNotStreet(x,y-1)) tilePos = [18,2]; //[11,19];//
          // else if (isNotStreet(x-1,y)) tilePos = [19,3];//[11,19];
          else if (this.tiles[x][y - 1].blocked) tilePos = [18,2];
          else if (this.tiles[x - 1][y].blocked) tilePos = [19,3];

          else {
            //									tilePos = [12,19];
            tilePos = [18,3];
            //									if (x%2 == 0 && y%2 == 0) tilePos = [11,19];
            //									else tilePos = [11,20];
          }
      }
      this.tiles[x][y] = {tile: tilePos, blocked: isPlaza, x: x, y: y}
    }
  }

  return this.tiles;

  }
}

class GrassMap extends MapMaker {
  constructor(cols, rows, tilesize) {
    super(cols, rows, tilesize);
  }

  generate() {
    var grassTiles = [[0, 24], [1, 24], [19,27]]
    this.tiles = this.createArray(this.cols, this.rows);
    for (var x = 0; x < this.cols; x++) {
      for (var y = 0; y < this.rows; y++) {

        let tilePos = null;
        let isRock = false;
        if (x == 0 && y == 0) tilePos = [0, 25];
        else if (x == 0 && y == this.rows-1) tilePos = [0,27];
        else if (x == this.cols-1 && y == 0) tilePos = [2,25];
        else if (x == this.cols-1 && y == this.rows-1) tilePos = [2,27];


        // sides
        else if (x == 0) tilePos = [0,26];
        else if (x == this.cols-1) tilePos = [2,26];
        else if (x == 0 ) tilePos = [1,25];
        else if (y == this.rows-1) tilePos = [1,27];
        else if (y == 0) tilePos = [1, 25];
        else {
          tilePos = grassTiles[rand(grassTiles.length)]
          isRock = Math.random() > 0.85
        }

        this.tiles[x][y] = {tile: tilePos, blocked: isRock, x: x, y: y}
      }
    }
    return this.tiles;
  }
}


class Agent {
  constructor(simulation, container) {
    this.moveCloser = this.moveCloser.bind(this);
    this.update = this.update.bind(this);
    this.updateDestination = this.updateDestination.bind(this);

    this.active = true;
    this.simulation = simulation;
    this.container = container;
    this.sprite = null;
    this.kill = false;
    this.killing = false;
    this.killtime = 0;

    this.name = NAMES[rand(NAMES.length)];

    this.id = currentId;
    currentId += 1;

    this.lastLoc = { x: -1, y: -1 };
    this.lastLoc2 = { x:-1, y:-1 };

    this.waitTimer = 0;
    this.loc = simulation.getRandomPos();
    this.ping = simulation.getRandomPos();
    this.updateDestination();
    this.amount = 10;
    this.alphaScale = d3.scaleLinear().domain([0,3]).range([1,0]);
    // this.ping = { x: 100, y: 100 };

    if (simulation.isStreet(this.loc.x+1, this.loc.y) || simulation.isStreet(this.loc.x - 1, this.loc.y)) {
    //if (true) {
      this.facing = ['W','E'][rand(1)];
    }
    else {
      this.facing = ['N','S'][rand(1)];
    }


    this.hair = AGENT_HAIR[rand(AGENT_HAIR.length)];
    this.color = AGENT_COLORS[rand(AGENT_COLORS.length)];

    this.sprite = su.sprite(PACK['character_' + this.hair + '_' + this.color + '.png']);
    this.sprite.anchor.x = 0.5;
    this.sprite.anchor.y = 0.5;
    this.sprite.scale.set(0.5);

    this.container.addChild(this.sprite);

    this.render();
  }

  getRotation(s) {
    let newRotation = 0;
    switch(this.facing) {
      case 'E':newRotation = Math.PI * 0.5; break;
      case 'S':newRotation = Math.PI * 1; break;
      case 'W':newRotation = Math.PI * 1.5; break;
      case 'N':newRotation = 0; break;
    }
    if (s.rotation-newRotation > Math.PI) {
      return newRotation+(Math.PI*2);
    }
    else if (s.rotation-newRotation < -Math.PI) {
      return newRotation-(Math.PI*2);
    }
    return newRotation;
  }

  isLastLoc2(x,y){
    return this.lastLoc2.x == x && this.lastLoc2.y == y;
  }

  waiting() {
    return this.waitTimer > 0 || this.killing;
  }

  updateWait() {
    this.waitTimer = this.waitTimer - 1;
    this.waitTimer = Math.max(this.waitTimer, 0);
    if (this.color !== 'red') {
      this.amount += this.waitTimer;
    }
  }

  updateKilling() {
    this.killtime += 1;
    this.sprite.alpha = this.alphaScale(this.killtime);
    if (this.killtime >= 6) {
      this.kill = true; // to remove from list
      su.remove(this.sprite);
      this.sprite.destroy();
    }
  }

  startWait(newWaitTimer) {
    this.waitTimer = newWaitTimer;
  }

  updateDestination(newDest) {
    // this.target = this.simulation.getRandomResource()
    // this.ping = {x: this.target.posX - 1, y: this.target.posY - 1};
    this.ping = this.simulation.getRandomPos();
    var gridClone = this.simulation.grid.clone();
    this.path = this.simulation.finder.findPath(this.loc.y, this.loc.x, this.ping.y, this.ping.x, gridClone);
    this.pathIndex = 0;
  }

  updateHits() {
    let shaking = false;
    if (this.color !== 'red') {
      const reds = this.simulation.drivers.filter((d) => !d.kill && d.color === 'red');

      reds.forEach((r) => {
        if (b.hit(this.sprite, r.sprite)) {
          var stealAmount = Math.max(Math.round(this.amount / 2), 5);
          this.amount = this.amount - stealAmount;
          r.amount = r.amount + stealAmount;
          shaking = true;
        }
      })
    }

    if (this.color !== 'green') {
      const greens = this.simulation.drivers.filter((d) => !d.kill && d.color === 'green');

      greens.forEach((r) => {
        if (b.hit(this.sprite, r.sprite)) {
          if (r.amount >= 5) {
            this.amount = this.amount + 5;
            r.amount -= 5;
          }
        }
      })
    }

    if (this.amount <= 0) {
      this.killing = true;
      console.log('DEAD')
    }

    if(shaking) {
      this.sprite.tint = 0xF47611;
    } else {

      this.sprite.tint = '0xFFFFFF';
    }

  }

  update() {
    if (!this.kill) {
      this.updateHits()
    }
    if(this.killing) {
      this.updateKilling();
    } else if (this.waiting()) {
      this.updateWait();

    } else {
      if(sameLoc(this.ping, this.loc)) {
        this.updateDestination();
        this.startWait(10)
      }
      this.moveCloser(this.ping)
    }
  }

  moveCloser(you) {
    if(this.path && this.path[this.pathIndex]) {
      var x = this.path[this.pathIndex][1]
      var y = this.path[this.pathIndex][0]
      this.loc.x = x;
      this.loc.y = y;

    } else {
      console.log('ERROR - no path');
      this.updateDestination();
    }

    //
    if (y > this.lastLoc.y) { this.facing = 'N'}
    else if (y < this.lastLoc.y) { this.facing = 'S'}
    else if (x < this.lastLoc.x) { this.facing = 'E' }
    else if (x > this.lastLoc.x) { this.facing = 'W' }


    // history
    this.lastLoc2.x = this.lastLoc.x;
    this.lastLoc2.y = this.lastLoc.y;
    this.lastLoc.x = this.loc.x;
    this.lastLoc.y = this.loc.y;

    // increase pathIndex
    this.pathIndex = Math.min(this.pathIndex + 1, this.path.length);
  }

  moveCloser2(you) {
    // let you = this.ping;
    let x = this.loc.x;
    let y = this.loc.y;
    let isStreet = this.simulation.isStreet;


    // bias toward continuing north to prevent snaking.
    if (this.facing == 'N' && y > you.y && isStreet(x,y-1) && !this.isLastLoc2(x,y-1)) { this.loc.y-=1; this.facing = 'N'}

    // then pure direction
    else if (x < you.x && isStreet(x+1,y) && !this.isLastLoc2(x+1,y)) { this.loc.x+=1; this.facing = 'E'}
    else if (y < you.y && isStreet(x,y+1) && !this.isLastLoc2(x,y+1)) { this.loc.y+=1; this.facing = 'S'}
    else if (x > you.x && isStreet(x-1,y) && !this.isLastLoc2(x-1,y)) { this.loc.x-=1; this.facing = 'W'}
    else if (y > you.y && isStreet(x,y-1) && !this.isLastLoc2(x,y-1)) { this.loc.y-=1; this.facing = 'N'}

    // then avoid objects
    else if (y >= you.y && isStreet(x,y-1) && !this.isLastLoc2(x,y-1)) { this.loc.y-=1; this.facing = 'N'}
    else if (x >= you.x && isStreet(x-1,y) && !this.isLastLoc2(x-1,y)) { this.loc.x-=1; this.facing = 'W'}
    else if (y <= you.y && isStreet(x,y+1) && !this.isLastLoc2(x,y+1)) { this.loc.y+=1; this.facing = 'S'}
    else if (x <= you.x && isStreet(x+1,y) && !this.isLastLoc2(x+1,y)) { this.loc.x+=1; this.facing = 'E'}

    else {
      // console.log("blocked", x, y, you.x, you.y);
    }

    // record history
    this.lastLoc2.x = this.lastLoc.x;
    this.lastLoc2.y = this.lastLoc.y;
    this.lastLoc.x = this.loc.x;
    this.lastLoc.y = this.loc.y;
  }

  render() {
    let s = this.sprite;
    if (s) {

      // IMPORTANT
      s.y = TILESIZE * this.loc.y + TILESIZE * 0.5;
      s.x = TILESIZE * this.loc.x + TILESIZE * 0.5;

      s.rotation = this.getRotation(s);

    } else {
      console.log('NO SPRITE')
    }
  }
}

const SIMDEFAULTS = {

  fps: 5,

  farePerMin: 1.0,
  costPerMin:0.10,
  bookingFee:1.50,
  surgeMult: 2,
  companyShare: 0.2,

  autoScaling: true,

  driversPark: true,

  canvasAlign: 'left',
  numDrivers: 50,
  paxChance: 0.4,
  paxPer: 1, // generated per chance
  surgePaxRedux: 0.3,

  rows: "auto", // number of car rows
  cols: "auto", // number of car rows
  minWage: 0,
  resolution: 1, // scaling
  slowDispatch: false, // exponential scaling!
  buttonSetup: null,
  paxWait: 10,
  maxDrivers: 999,
}

class Simulation {

  constructor(options) {
    this.options = Object.assign({}, SIMDEFAULTS, options);
    this.generateBackground = this.generateBackground.bind(this);
    this.update = this.update.bind(this);
    this.onResize = this.onResize.bind(this);
    this.isNotStreet = this.isNotStreet.bind(this);
    this.isStreet = this.isStreet.bind(this);
    this.getRandomPos = this.getRandomPos.bind(this);

  }

  init() {
    this.bg = null; // background
    this.fg = null; // foreground
    this.engine = null;
    this.stage = null;
    this.dBox = null; // particle container for drivers
    this.pBox = null; // particle container for pax
    this.pixiLoaded = false;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.iteration = 0;
    this.endIteration = 0;
    // this.width = 500
    // this.height = 200

    this.drivers = [];

    this.initDimensions();

    this.initPixi();
    this.initChart();
  }

  initChart() {
    d3.select('#vis').append('text')
      .attr('x', 20)
      .attr('y', 40)
      .attr('class', 'title')
      .text('Amounts')
    d3.select('#vis').append('g')
      .attr('transform', 'translate(10, 40)')
      .attr('id', 'amounts')
  }

  initDimensions() {
    if (this.options.rows == "auto") {
      this.options.rows = Math.floor(this.height / this.options.resolution / TILESIZE);
      if ((this.options.rows+1) % 2) this.options.rows--;

    }
    if (this.options.cols == "auto") {
      this.options.cols = Math.floor(this.width / this.options.resolution / TILESIZE);
      if ((this.options.cols+1) % 2) this.options.cols--;
    }

  }

  initPixi() {

    this.renderer = PIXI.autoDetectRenderer(512, 256);
    // this.renderer.backgroundColor = 0xFFFFFF;
    this.renderer.plugins.interaction.autoPreventDefault = false;

    document.getElementById('sim').appendChild(this.renderer.view)
    //document.body.appendChild(this.renderer.view);

    this.stage = new PIXI.Container();


    this.engine = new Smoothie({
      engine: PIXI,
      renderer: this.renderer,
      root: this.stage,
      fps: this.options.fps,
      interpolate: true, // magic
      properties: {
        position: true,
        rotation: true,
        alpha: true,
        scale: true,
        size: false,
        tile: false
      },
      update: this.update  // will run this update loop at set fps
    });

    this.onResize();

    console.log('engine made');

    this.dBox = su.group();

    this.stage.addChild(this.dBox);

    this.pBox = new PIXI.particles.ParticleContainer(15000, {
      rotation: true,
      uvs: true,
      scale: true,
      alpha: true
    });



    //this.stage.addChild(this.pBox);

    PACK = PIXI.loader.resources[ "imgs/city-pack.json" ].textures;

    // var cat = new PIXI.Sprite(
    //   PIXI.loader.resources["imgs/cat.png"].texture
    // );
    // this.stage.addChild(cat);

    const mm = new GrassMap(this.options.cols, this.options.rows, TILESIZE);

    this.map = mm.generate();
    this.grid = new PF.Grid(mm.toGrid(this.map));
    console.log(this.grid)
    this.finder = new PF.AStarFinder();

    this.generateBackground();

    this.pixiLoaded = true;

    for (let i = 0; i < this.options.numDrivers; i++) {
      this.generateAgent();
    }


    this.engine.start();
  }

  onResize() {
    // this.renderer.view.style.position = "absolute";
    this.renderer.view.style.display = "block";
    this.renderer.autoResize = true;

    let ratio = ((this.width / this.options.resolution / TILESIZE) / this.options.cols);
    this.engine.renderer.view.style.width = (ratio *  this.width - (TILESIZE * this.options.resolution)) + 'px';
    this.engine.renderer.view.style.height = (ratio *  this.height - (TILESIZE * this.options.resolution)) + 'px';
    this.renderer.resize(this.width, this.height);
  }

  onEnd() {
    window.location.reload();
  }

  destroyBackground() {

    // const that = this;
    if (this.bg) {
      this.stage.removeChild(this.bg);
      this.bg.destroy();
      this.bg = null;
    }

    if (this.fg) {
      this.stage.removeChild(this.fg);
      this.fg.destroy();
      this.fg = null;
    }
  }

  generateBackground() {
    this.destroyBackground();

    const that = this;
    console.log('background')

    let pad = 2;
    let plazas = [];

    let getTile = function(x, y) {
      let sprite = su.sprite(
        su.frame("imgs/city-tilesx2.png",
          x * (TILESIZE * 2 + pad),
          y * (TILESIZE * 2 + pad),
          TILESIZE * 2,
          TILESIZE * 2)
      );
      sprite.scale.set(0.5);
      return sprite;
    };

    let bg = su.grid(that.options.cols, that.options.rows, TILESIZE, TILESIZE, true, 0,0,
      function(x, y) {
        const t = that.map[x][y];
        let sprite = getTile(t.tile[0], t.tile[1])
        sprite.alpha = 0.7
        return sprite;
      });
      this.stage.addChildAt(bg, 0);
      this.bg = bg;

      const rockTiles = [[33, 3], [14, 18], [13, 18], [32, 13], [33, 13]]

      this.fg = su.group();
      for (var x = 0; x < this.map.length; x++) {
        for (var y = 0; y < this.map[0].length; y++) {
          if (this.map[x][y].blocked) {
            let rockTile = rockTiles[rand(rockTiles.length)]
            let rock = getTile(rockTile[0], rockTile[1]);
            rock.x = x * TILESIZE;
            rock.y = y * TILESIZE;
            rock.posX = x;
            rock.posY = y;
            rock.alpha = 1.0;
            rock.tint = 0xFFFFFF;
            // rock.scale.set(0.8);
            this.fg.addChild(rock)
          }
        }
      }
      this.stage.addChild(this.fg);
      console.log(this.fg.children[0])
  }

  getRandomResource() {
    return this.fg.children[rand(this.fg.children.length)];
  }

  getRandomPos() {
    let pos = {};
    let limit = 500;

    do {
      limit++;
      pos.x = Math.floor(this.options.cols * Math.random());
      pos.y = Math.floor(this.options.rows * Math.random());
    } while (limit && this.isNotStreet(pos.x, pos.y));

    return pos;
  }

  isNotStreet(x, y) {
    return x < 0 || x >= this.options.cols || y < 0 || y >= this.options.rows || // in bounds
    this.map[x][y].blocked; // not a 'pillar'
  }

  isStreet(x, y) {
    return !(this.isNotStreet(x,y));
  }

  generateAgent() {
    let d = new Agent(this, this.dBox);
    this.drivers.push(d);
    this.totalDrivers++;
  }

  updateChart() {
    const alive = this.drivers.filter((d) => !d.kill).sort((a, b) => b.amount - a.amount);
    const vis = d3.select('#vis').select('#amounts')
    let actors = vis.selectAll('.actor')
      .data(alive, (d) => d.id)

    let actorsE = actors.enter()
      .append('g')
      .classed('actor', true)

    actorsE.append('rect');
    actorsE.append('text')
      .classed('amount', true)
    actorsE.append('text')
      .classed('name', true)

    actors.exit().remove();

    actors = actors.merge(actorsE)
      // .attr('x', 10)
    actors.selectAll('.amount')
      .text((d) => d.amount)
      .attr('fill', 'white')
      .attr('x', '60')
      .attr('dy', 14)

    actors.selectAll('.name')
      .text((d) => d.name.first_name + ' ' + d.name.last_name)
      .attr('fill', 'white')
      .attr('x', '100')
      .attr('dy', 14)

    actors.selectAll('rect')
      .attr('fill', (d) => AGENT_COLOR_DISPLAY[d.color])
      .attr('width', 50)
      .attr('height', 20)

    actors.transition()
      .duration(500)
      .attr('transform', (d, i) => `translate(${10}, ${((i * 25) + 14)})`)

  }

  update() {
    this.drivers.filter((d) => !d.kill).forEach((d) => {
      d.update();
    })
    this.render();

    if(this.drivers.length > 0 && this.iteration % 20 === 0) {
      const remaining = this.drivers.filter((d) => !d.kill && !(d.color === 'red'))
      const remainingSum = d3.sum(remaining, (d) => d.amount)
      const reds = this.drivers.filter((d) => !d.kill && (d.color === 'red'))
      const redsSum = d3.sum(reds, (d) => d.amount)
      if (remainingSum * 2 < redsSum) {
        this.endIteration += 1;
      }

      if (this.endIteration > 0) {
        this.bg.alpha = 1 / this.endIteration;
        console.log(this.endIteration)
      }

      if(this.endIteration > 4) {
        this.onEnd();
      }
    }

    if (this.iteration % 4 === 0) {
      this.updateChart();
    }
    su.update();
    this.iteration += 1;
  }


  render() {
    if (!this.pixiLoaded) return;

    this.drivers.filter((d) => !d.kill).forEach((d) => d.render());

  }
}

const sim = new Simulation();

PIXI.loader
  .add('imgs/city-tilesx2.png')
  .add('imgs/city-pack.json')
  .add('imgs/cat.png')
  .load(function (loader, resources) {
    console.log('assets loaded');
    sim.init();
  });
