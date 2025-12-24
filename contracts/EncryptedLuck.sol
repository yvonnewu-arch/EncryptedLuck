// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint32, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title EncryptedLuck
/// @notice A two-ball lottery using encrypted picks and encrypted points.
contract EncryptedLuck is ZamaEthereumConfig {
    uint256 private constant TICKET_PRICE = 0.001 ether;

    struct Ticket {
        euint8 first;
        euint8 second;
        bool active;
    }

    struct Draw {
        euint8 first;
        euint8 second;
    }

    mapping(address => Ticket) private _tickets;
    mapping(address => Draw) private _lastDraw;
    mapping(address => euint32) private _points;

    event TicketPurchased(address indexed player);
    event DrawCompleted(address indexed player, euint32 reward);
    event PointsUpdated(address indexed player, euint32 totalPoints);

    /// @notice Buy a ticket with two encrypted numbers.
    /// @param pickOne Encrypted first number
    /// @param pickTwo Encrypted second number
    /// @param inputProof Zama input proof
    function buyTicket(externalEuint8 pickOne, externalEuint8 pickTwo, bytes calldata inputProof) external payable {
        require(msg.value == TICKET_PRICE, "Ticket costs 0.001 ETH");
        require(!_tickets[msg.sender].active, "Active ticket exists");

        euint8 first = FHE.fromExternal(pickOne, inputProof);
        euint8 second = FHE.fromExternal(pickTwo, inputProof);

        first = _normalizeBall(first);
        second = _normalizeBall(second);

        _tickets[msg.sender] = Ticket({first: first, second: second, active: true});

        FHE.allowThis(first);
        FHE.allow(first, msg.sender);
        FHE.allowThis(second);
        FHE.allow(second, msg.sender);

        emit TicketPurchased(msg.sender);
    }

    /// @notice Draw two encrypted random numbers and update points.
    function draw() external {
        Ticket storage ticket = _tickets[msg.sender];
        require(ticket.active, "No active ticket");

        euint8 drawOne = _randomBall();
        euint8 drawTwo = _randomBall();

        _lastDraw[msg.sender] = Draw({first: drawOne, second: drawTwo});

        ebool match11 = FHE.eq(ticket.first, drawOne);
        ebool match12 = FHE.eq(ticket.first, drawTwo);
        ebool match21 = FHE.eq(ticket.second, drawOne);
        ebool match22 = FHE.eq(ticket.second, drawTwo);

        ebool twoMatches = FHE.or(FHE.and(match11, match22), FHE.and(match12, match21));
        ebool anyMatch = FHE.or(FHE.or(match11, match12), FHE.or(match21, match22));

        euint32 reward = FHE.select(
            twoMatches,
            FHE.asEuint32(10),
            FHE.select(anyMatch, FHE.asEuint32(1), FHE.asEuint32(0))
        );

        _points[msg.sender] = FHE.add(_points[msg.sender], reward);
        ticket.active = false;

        FHE.allowThis(drawOne);
        FHE.allow(drawOne, msg.sender);
        FHE.allowThis(drawTwo);
        FHE.allow(drawTwo, msg.sender);
        FHE.allowThis(_points[msg.sender]);
        FHE.allow(_points[msg.sender], msg.sender);

        emit DrawCompleted(msg.sender, reward);
        emit PointsUpdated(msg.sender, _points[msg.sender]);
    }

    /// @notice Get the encrypted ticket for a player.
    function getTicket(address player) external view returns (euint8, euint8, bool) {
        Ticket memory ticket = _tickets[player];
        return (ticket.first, ticket.second, ticket.active);
    }

    /// @notice Get the last draw result for a player.
    function getLastDraw(address player) external view returns (euint8, euint8) {
        Draw memory lastDraw = _lastDraw[player];
        return (lastDraw.first, lastDraw.second);
    }

    /// @notice Get the encrypted points for a player.
    function getPoints(address player) external view returns (euint32) {
        return _points[player];
    }

    /// @notice Return ticket price in wei.
    function getTicketPrice() external pure returns (uint256) {
        return TICKET_PRICE;
    }

    function _randomBall() internal returns (euint8) {
        return FHE.add(FHE.randEuint8(9), 1);
    }

    function _normalizeBall(euint8 value) internal returns (euint8) {
        euint8 minValue = FHE.asEuint8(1);
        euint8 maxValue = FHE.asEuint8(9);
        return FHE.min(FHE.max(value, minValue), maxValue);
    }
}
