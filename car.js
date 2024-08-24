class Car {
    constructor(x, y, width, height, controlType, angle = 0, maxSpeed = 3, color = "blue") {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.speed = 0;
        this.acceleration = 0.2;
        this.maxSpeed = maxSpeed;
        this.friction = 0.05;
        this.angle = angle;
        this.damaged = false;


        this.fittness = 0;

        this.useBrain = controlType == "AI";

        if (controlType != "DUMMY") {
            this.sensor = new Sensor(this);
            this.brain = new NeuralNetwork(
                [this.sensor.rayCount, 6, 4]
            );
        }
        this.controls = new Controls(controlType);

        this.img = new Image();
        this.img.src = "car.png"

        this.mask = document.createElement("canvas");
        this.mask.width = width;
        this.mask.height = height;

        const maskCtx = this.mask.getContext("2d");
        this.img.onload = () => {
            maskCtx.fillStyle = color;
            maskCtx.rect(0, 0, this.width, this.height);
            maskCtx.fill();

            maskCtx.globalCompositeOperation = "destination-atop";
            maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
        }
    }

    update(roadBorders, traffic) {
        if (!this.damaged) {
            this.move();
            this.fittness += this.speed;
            this.polygon = this.createPolygon();
            const wasDamaged = this.damaged;
            this.damaged = this.assessDamage(roadBorders, traffic);

            // Increment the crash counter only if the car gets damaged in this frame
            if (!wasDamaged && this.damaged) {
                crashedCarsCount++;
            }
        }
        if (this.sensor) {
            this.sensor.update(roadBorders, traffic);
            const offsets = this.sensor.readings.map(
                s => s == null ? 0 : 1 - s.offset
            );
            const outputs = NeuralNetwork.feedForward(offsets, this.brain);

            if (this.useBrain) {
                this.controls.forward = outputs[0];
                this.controls.left = outputs[1];
                this.controls.right = outputs[2];
                this.controls.reverse = outputs[3];
            }
        }
    }


    assessDamage(roadBorders, traffic) {
        for (let i = 0; i < roadBorders.length; i++) {
            if (polysIntersect(this.polygon, roadBorders[i])) {
                return true;
            }
        }
        for (let i = 0; i < traffic.length; i++) {
            if (polysIntersect(this.polygon, traffic[i].polygon)) {
                return true;
            }
        }
        return false;
    }

    createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);
        points.push({
            x: this.x - Math.sin(this.angle - alpha) * rad,
            y: this.y - Math.cos(this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(this.angle + alpha) * rad,
            y: this.y - Math.cos(this.angle + alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad
        });
        return points;
    }

    move() {
        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration;
        }

        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
        if (this.speed < -this.maxSpeed / 2) {
            this.speed = -this.maxSpeed / 2;
        }

        if (this.speed > 0) {
            this.speed -= this.friction;
        }
        if (this.speed < 0) {
            this.speed += this.friction;
        }
        if (Math.abs(this.speed) < this.friction) {
            this.speed = 0;
        }

        if (this.speed != 0) {
            const flip = this.speed > 0 ? 1 : -1;
            if (this.controls.left) {
                this.angle += 0.03 * flip;
            }
            if (this.controls.right) {
                this.angle -= 0.03 * flip;
            }
        }

        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }

    draw(ctx, drawSensor = false) {
        if (this.sensor && drawSensor) {
            this.sensor.draw(ctx);
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-this.angle);
        if (!this.damaged) {
            ctx.drawImage(this.mask,
                -this.width / 2,
                -this.height / 2,
                this.width,
                this.height);
            ctx.globalCompositeOperation = "multiply";
        }
        ctx.drawImage(this.img,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height);
        ctx.restore();

    }

}

class RandomCar extends Car {
    constructor(x, y, width, height, controlType, angle = 0, maxSpeed = 3, color = "red") {
        super(x, y, width, height, controlType, angle, maxSpeed, color);
    }

    update(roadBorders, traffic) {
        if (!this.damaged) {
            this.#randomMove();
            this.fitness += this.speed;
            this.polygon = this.createPolygon();
            this.damaged = this.assessDamage(roadBorders, traffic);
        }
    }

    #randomMove() {
        const randomDirection = Math.random();
        if (randomDirection < 0.25) {
            this.controls.forward = true;
            this.controls.left = false;
            this.controls.right = false;
            this.controls.reverse = false;
        } else if (randomDirection < 0.5) {
            this.controls.forward = false;
            this.controls.left = true;
            this.controls.right = false;
            this.controls.reverse = false;
        } else if (randomDirection < 0.75) {
            this.controls.forward = false;
            this.controls.left = false;
            this.controls.right = true;
            this.controls.reverse = false;
        } else {
            this.controls.forward = false;
            this.controls.left = false;
            this.controls.right = false;
            this.controls.reverse = true;
        }

        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration;
        }

        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed;
        }
        if (this.speed < -this.maxSpeed / 2) {
            this.speed = -this.maxSpeed / 2;
        }

        if (this.speed > 0) {
            this.speed -= this.friction;
        }
        if (this.speed < 0) {
            this.speed += this.friction;
        }
        if (Math.abs(this.speed) < this.friction) {
            this.speed = 0;
        }

        if (this.speed != 0) {
            const flip = this.speed > 0 ? 1 : -1;
            if (this.controls.left) {
                this.angle += 0.03 * flip;
            }
            if (this.controls.right) {
                this.angle -= 0.03 * flip;
            }
        }

        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }
}


class RuleBasedCar extends Car {
    constructor(x, y, width, height, controlType, angle = 0, maxSpeed = 3, color = "red") {
        super(x, y, width, height, controlType, angle, maxSpeed, color);
        this.sensor = new Sensor(this);
    }

    update(roadBorders, traffic) {
        if (!this.damaged) {
            this.#ruleBasedMove(roadBorders, traffic);
            this.fitness += this.speed;
            this.polygon = this.createPolygon();
            this.damaged = this.assessDamage(roadBorders, traffic);
        }
        this.sensor.update(roadBorders, traffic);
    }

    #ruleBasedMove(roadBorders, traffic) {
        const readings = this.sensor.readings;
        const frontSensor = readings[2]; // Middle sensor
        const leftFrontSensor = readings[1];
        const rightFrontSensor = readings[3];
        const leftSensor = readings[0];
        const rightSensor = readings[4];

        this.controls.forward = true;
        this.controls.left = false;
        this.controls.right = false;
        this.controls.reverse = false;

        const safeDistance = 0.6; // General safe distance to maintain
        const sharpTurnThreshold = 0.3; // Distance threshold to initiate a sharp turn
        const turnSpeedReductionFactor = 0.4; // Reduce speed significantly during sharp turns
        const slowTurnFactor = 0.7; // Moderate speed reduction for normal turns

        // Obstacle detected ahead
        if (frontSensor && frontSensor.offset < safeDistance) {
            // Handle sharp turns by checking side sensors
            if (leftFrontSensor && leftFrontSensor.offset < sharpTurnThreshold) {
                // Sharp left turn ahead, steer right
                this.controls.right = true;
                this.speed *= turnSpeedReductionFactor;
            } else if (rightFrontSensor && rightFrontSensor.offset < sharpTurnThreshold) {
                // Sharp right turn ahead, steer left
                this.controls.left = true;
                this.speed *= turnSpeedReductionFactor;
            } else {
                // General obstacle ahead, choose the side with more space
                if (leftSensor && rightSensor) {
                    if (leftSensor.offset > rightSensor.offset) {
                        this.controls.left = true;
                    } else {
                        this.controls.right = true;
                    }
                } else if (leftSensor) {
                    this.controls.left = true;
                } else if (rightSensor) {
                    this.controls.right = true;
                } else {
                    // No space, reverse
                    this.controls.forward = false;
                    this.controls.reverse = true;
                }
                // Reduce speed for normal turns
                this.speed *= slowTurnFactor;
            }
        } else if (leftSensor && leftSensor.offset < sharpTurnThreshold) {
            // Too close to the left side, steer right
            this.controls.right = true;
            this.speed *= turnSpeedReductionFactor;
        } else if (rightSensor && rightSensor.offset < sharpTurnThreshold) {
            // Too close to the right side, steer left
            this.controls.left = true;
            this.speed *= turnSpeedReductionFactor;
        }

        // Adjust speed based on controls
        this.move();
    }

    draw(ctx) {
        super.draw(ctx, true); // Always draw sensor
    }
}
